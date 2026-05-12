/**
 * Stripe API — real data endpoints
 *
 * GET  /api/stripe?action=invoices&limit=50&status=all|paid|open|overdue
 * GET  /api/stripe?action=customers&limit=50
 * GET  /api/stripe?action=payments&limit=50
 * GET  /api/stripe?action=mrr
 * GET  /api/stripe?action=overview   → stats: mrr, pending, overdue, total_customers
 * POST /api/stripe  body: { action: 'create_invoice', customerId, amount, description, currency? }
 * POST /api/stripe  body: { action: 'finalize_invoice', invoiceId }
 * POST /api/stripe  body: { action: 'void_invoice', invoiceId }
 * POST /api/stripe  body: { action: 'create_customer', name, email }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Stripe from 'stripe';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { createStripeClient } from '@/lib/stripe';
import { getDecryptedSecret } from '@/lib/user-secret-store';

async function getStripeContext(
  userId: string,
): Promise<{ stripe: Stripe; secretKey: string } | null> {
  const secretKey = (await getDecryptedSecret(userId, 'stripe_secret'))?.trim();
  if (!secretKey) return null;
  return {
    stripe: createStripeClient(secretKey),
    secretKey,
  };
}

function notConnected() {
  return NextResponse.json(
    {
      error: 'No Stripe account connected',
      code: 'STRIPE_NOT_CONNECTED',
      hint: 'Add your Stripe secret key under Settings → API Keys or Integrations.',
    },
    { status: 403 },
  );
}

// ─── GET ─────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('stripe', userId));
  if (rlDenied) return rlDenied;

  const ctx = await getStripeContext(userId);
  if (!ctx) return notConnected();
  const { stripe, secretKey } = ctx;
  const { searchParams } = req.nextUrl;
  const action = searchParams.get('action') ?? 'overview';
  const limit  = Math.min(Number(searchParams.get('limit') ?? 50), 100);
  const status = searchParams.get('status') ?? 'all';

  try {
    // ── Overview stats ─────────────────────────────────────────────────────
    if (action === 'overview') {
      const [invoices, customers, balance] = await Promise.all([
        stripe.invoices.list({ limit: 100 }),
        stripe.customers.list({ limit: 100 }),
        stripe.balance.retrieve(),
      ]);

      const paid    = invoices.data.filter(i => i.status === 'paid');
      const open    = invoices.data.filter(i => i.status === 'open');
      const overdue = open.filter(i => i.due_date && i.due_date * 1000 < Date.now());

      const mrrTotal = paid
        .filter(i => {
          const d = new Date(i.created * 1000);
          const now = new Date();
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, i) => sum + (i.amount_paid ?? 0), 0);

      const availableBalance = balance.available.reduce((s, b) => s + b.amount, 0);

      return NextResponse.json({
        mrr:              mrrTotal / 100,
        pending_amount:   open.reduce((s, i) => s + (i.amount_due ?? 0), 0) / 100,
        overdue_amount:   overdue.reduce((s, i) => s + (i.amount_due ?? 0), 0) / 100,
        total_customers:  customers.data.length,
        total_invoices:   invoices.data.length,
        paid_count:       paid.length,
        open_count:       open.length,
        overdue_count:    overdue.length,
        balance:          availableBalance / 100,
        test_mode:        secretKey.startsWith('sk_test_'),
      });
    }

    // ── Invoices ───────────────────────────────────────────────────────────
    if (action === 'invoices') {
      const params: Stripe.InvoiceListParams = { limit, expand: ['data.customer'] };
      if (status === 'paid')  params.status = 'paid';
      if (status === 'open')  params.status = 'open';

      const invoices = await stripe.invoices.list(params);
      const now = Date.now();

      const items = invoices.data.map(inv => {
        const isOverdue = inv.status === 'open' && inv.due_date && inv.due_date * 1000 < now;
        const customer  = inv.customer as Stripe.Customer | null;
        return {
          id:           inv.id,
          number:       inv.number,
          status:       isOverdue ? 'overdue' : inv.status,
          amount_due:   (inv.amount_due ?? 0) / 100,
          amount_paid:  (inv.amount_paid ?? 0) / 100,
          currency:     inv.currency.toUpperCase(),
          customer_id:  typeof inv.customer === 'string' ? inv.customer : customer?.id,
          customer_name: customer?.name ?? customer?.email ?? 'Unknown',
          customer_email: customer?.email,
          due_date:     inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
          created:      new Date(inv.created * 1000).toISOString(),
          description:  inv.description,
          hosted_invoice_url: inv.hosted_invoice_url,
          invoice_pdf:  inv.invoice_pdf,
        };
      });

      // Filter overdue client-side if requested
      const filtered = status === 'overdue' ? items.filter(i => i.status === 'overdue') : items;
      return NextResponse.json({ invoices: filtered });
    }

    // ── Customers ──────────────────────────────────────────────────────────
    if (action === 'customers') {
      const customers = await stripe.customers.list({ limit });
      const items = await Promise.all(
        customers.data.map(async c => {
          const invoices = await stripe.invoices.list({ customer: c.id, limit: 10 });
          const totalPaid = invoices.data
            .filter(i => i.status === 'paid')
            .reduce((s, i) => s + (i.amount_paid ?? 0), 0);
          return {
            id:          c.id,
            name:        c.name ?? c.email ?? 'Unknown',
            email:       c.email,
            created:     new Date(c.created * 1000).toISOString(),
            total_paid:  totalPaid / 100,
            currency:    c.currency?.toUpperCase() ?? 'USD',
            balance:     (c.balance ?? 0) / 100,
          };
        })
      );
      return NextResponse.json({ customers: items });
    }

    // ── Payments ───────────────────────────────────────────────────────────
    if (action === 'payments') {
      const charges = await stripe.charges.list({ limit, expand: ['data.customer'] });
      const items = charges.data.map(ch => ({
        id:             ch.id,
        amount:         ch.amount / 100,
        currency:       ch.currency.toUpperCase(),
        status:         ch.status,
        customer_name:  (ch.customer as Stripe.Customer | null)?.name ?? ch.billing_details?.name ?? 'Unknown',
        customer_email: (ch.customer as Stripe.Customer | null)?.email ?? ch.billing_details?.email,
        created:        new Date(ch.created * 1000).toISOString(),
        description:    ch.description,
        receipt_url:    ch.receipt_url,
      }));
      return NextResponse.json({ payments: items });
    }

    // ── MRR history (last 6 months) ────────────────────────────────────────
    if (action === 'mrr') {
      const sixMonthsAgo = Math.floor(Date.now() / 1000) - 6 * 30 * 24 * 3600;
      const invoices = await stripe.invoices.list({
        limit: 100,
        status: 'paid',
        created: { gte: sixMonthsAgo },
      });

      // Group by YYYY-MM
      const byMonth: Record<string, number> = {};
      for (const inv of invoices.data) {
        const key = new Date(inv.created * 1000).toLocaleString('en-US', { month: 'short', year: 'numeric' });
        byMonth[key] = (byMonth[key] ?? 0) + (inv.amount_paid ?? 0) / 100;
      }

      const history = Object.entries(byMonth)
        .map(([month, amount]) => ({ month, amount }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

      return NextResponse.json({ history });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('stripe-post', userId));
  if (rlDenied) return rlDenied;

  const ctx = await getStripeContext(userId);
  if (!ctx) return notConnected();
  const { stripe } = ctx;
  const body = await req.json();

  try {
    // ── Create customer ────────────────────────────────────────────────────
    if (body.action === 'create_customer') {
      const { name, email } = body;
      if (!name || !email || typeof name !== 'string' || typeof email !== 'string') {
        return NextResponse.json({ error: 'name and email required' }, { status: 400 });
      }
      if (name.length > 200 || email.length > 320) {
        return NextResponse.json({ error: 'name or email too long' }, { status: 400 });
      }
      const customer = await stripe.customers.create({ name, email });
      return NextResponse.json({ id: customer.id, name: customer.name, email: customer.email });
    }

    // ── Create invoice ─────────────────────────────────────────────────────
    if (body.action === 'create_invoice') {
      const { customerId, amount, description, currency = 'usd', dueInDays = 30 } = body;
      if (!customerId || typeof customerId !== 'string' || !/^cus_[a-zA-Z0-9]+$/.test(customerId)) {
        return NextResponse.json({ error: 'valid Stripe customerId required' }, { status: 400 });
      }
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0 || amt > 1_000_000) {
        return NextResponse.json({ error: 'amount must be a positive number up to 1,000,000' }, { status: 400 });
      }
      const cur = String(currency).toLowerCase();
      if (!/^[a-z]{3}$/.test(cur)) {
        return NextResponse.json({ error: 'invalid currency' }, { status: 400 });
      }
      const dueRaw = Number(dueInDays);
      const safeDueDays = Number.isFinite(dueRaw) ? Math.min(365, Math.max(0, Math.floor(dueRaw))) : 30;

      // Add invoice item then create the invoice
      await stripe.invoiceItems.create({
        customer:    customerId,
        amount:      Math.round(amt * 100),
        currency:    cur,
        description: typeof description === 'string' ? description.slice(0, 500) : 'Services',
      });

      const dueDate = Math.floor(Date.now() / 1000) + safeDueDays * 24 * 3600;
      const invoice = await stripe.invoices.create({
        customer:         customerId,
        due_date:         dueDate,
        collection_method: 'send_invoice',
        auto_advance:     false,
      });

      return NextResponse.json({
        id:                  invoice.id,
        number:              invoice.number,
        status:              invoice.status,
        hosted_invoice_url:  invoice.hosted_invoice_url,
      });
    }

    // ── Finalize (send) invoice ────────────────────────────────────────────
    if (body.action === 'finalize_invoice') {
      const { invoiceId } = body;
      if (!invoiceId || typeof invoiceId !== 'string' || !/^in_[a-zA-Z0-9]+$/.test(invoiceId)) {
        return NextResponse.json({ error: 'valid invoiceId required' }, { status: 400 });
      }
      const invoice = await stripe.invoices.finalizeInvoice(invoiceId);
      return NextResponse.json({ id: invoice.id, status: invoice.status, hosted_invoice_url: invoice.hosted_invoice_url });
    }

    // ── Void invoice ───────────────────────────────────────────────────────
    if (body.action === 'void_invoice') {
      const { invoiceId } = body;
      if (!invoiceId || typeof invoiceId !== 'string' || !/^in_[a-zA-Z0-9]+$/.test(invoiceId)) {
        return NextResponse.json({ error: 'valid invoiceId required' }, { status: 400 });
      }
      await stripe.invoices.voidInvoice(invoiceId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stripe API error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
