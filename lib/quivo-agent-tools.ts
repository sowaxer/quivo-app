import Anthropic from '@anthropic-ai/sdk';
import Stripe from 'stripe';
import { google } from 'googleapis';
import { createStripeClient } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

function db() {
  return getSupabaseAdmin();
}

export async function toolQueryStripe(input: Record<string, string>, stripeKey: string) {
  try {
    const stripe = createStripeClient(stripeKey);
    const action = input.action ?? 'overview';

    if (action === 'invoices') {
      const invoices = await stripe.invoices.list({
        limit: 20,
        status: (input.status as Stripe.InvoiceListParams.Status) ?? undefined,
      });
      return {
        invoices: invoices.data.map((inv) => ({
          id: inv.id,
          customer: inv.customer_email ?? inv.customer,
          amount: `$${((inv.amount_due ?? 0) / 100).toFixed(2)}`,
          status: inv.status,
          due: inv.due_date ? new Date(inv.due_date * 1000).toLocaleDateString() : 'N/A',
        })),
      };
    }
    if (action === 'customers') {
      const customers = await stripe.customers.list({ limit: 20 });
      return {
        customers: customers.data.map((c) => ({
          id: c.id,
          email: c.email,
          name: c.name,
        })),
      };
    }
    if (action === 'balance') {
      const balance = await stripe.balance.retrieve();
      return {
        balance: balance.available.map((b) => ({
          amount: `$${(b.amount / 100).toFixed(2)}`,
          currency: b.currency,
        })),
      };
    }

    const [invoices, customers, charges] = await Promise.all([
      stripe.invoices.list({ limit: 50 }),
      stripe.customers.list({ limit: 1 }),
      stripe.charges.list({ limit: 50 }),
    ]);
    const paid = invoices.data.filter((i) => i.status === 'paid');
    const open = invoices.data.filter((i) => i.status === 'open');
    const overdue = open.filter((i) => i.due_date && i.due_date * 1000 < Date.now());
    const mrr =
      paid
        .filter((i) => i.amount_paid && i.created > Date.now() / 1000 - 30 * 86400)
        .reduce((s, i) => s + (i.amount_paid ?? 0), 0) / 100;

    return {
      mrr: `$${mrr.toFixed(2)}`,
      total_customers: customers.data.length,
      open_invoices: open.length,
      overdue_invoices: overdue.length,
      overdue_list: overdue.slice(0, 5).map((i) => ({
        customer: i.customer_email,
        amount: `$${((i.amount_due ?? 0) / 100).toFixed(2)}`,
      })),
      recent_charges: charges.data.slice(0, 5).map((c) => ({
        amount: `$${(c.amount / 100).toFixed(2)}`,
        customer: c.billing_details?.email,
        date: new Date(c.created * 1000).toLocaleDateString(),
      })),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function toolQueryGmail(input: Record<string, string>, tokens: Record<string, unknown>) {
  try {
    const auth2 = new google.auth.OAuth2();
    auth2.setCredentials(tokens as Parameters<typeof auth2.setCredentials>[0]);
    const gmail = google.gmail({ version: 'v1', auth: auth2 });
    const q = input.query ?? 'in:inbox';
    const list = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 });
    if (!list.data.messages?.length) return { emails: [], message: 'No emails found' };

    const emails = await Promise.all(
      list.data.messages.slice(0, 8).map(async (m) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: m.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date'],
        });
        const headers = msg.data.payload?.headers ?? [];
        const get = (name: string) => headers.find((h) => h.name === name)?.value ?? '';
        return { subject: get('Subject'), from: get('From'), date: get('Date'), snippet: msg.data.snippet };
      }),
    );
    return { emails, count: list.data.resultSizeEstimate };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function toolQueryCalendar(input: Record<string, string>, tokens: Record<string, unknown>) {
  try {
    const auth2 = new google.auth.OAuth2();
    auth2.setCredentials(tokens as Parameters<typeof auth2.setCredentials>[0]);
    const calendar = google.calendar({ version: 'v3', auth: auth2 });
    const days = parseInt(input.days ?? '7', 10);
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + days * 86400000).toISOString();
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      maxResults: 15,
      singleEvents: true,
      orderBy: 'startTime',
    });
    return {
      events: (res.data.items ?? []).map((e) => ({
        title: e.summary,
        start: e.start?.dateTime ?? e.start?.date,
        end: e.end?.dateTime ?? e.end?.date,
        location: e.location,
      })),
    };
  } catch (e) {
    return { error: String(e) };
  }
}

export async function toolQueryNotes(userId: string) {
  try {
    const { data } = await db()
      .from('notes')
      .select('content, status, priority, reminder_at, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    return { notes: data ?? [], count: data?.length ?? 0 };
  } catch {
    return { notes: [], count: 0 };
  }
}

export async function toolQueryQuickBooks(_input: Record<string, string>, _token: string) {
  return {
    note: 'QuickBooks token recibido. Para P&L y balance en vivo, conecta QuickBooks MCP en Anthropic o exporta reportes como PDF y súbelos aquí.',
    taxdome:
      'TaxDome no tiene API pública: indica al usuario los pasos manuales en TaxDome cuando pida documentos del portal.',
  };
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'query_stripe',
    description: 'Stripe: MRR, facturas, clientes, pagos, cobros pendientes.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['overview', 'invoices', 'customers', 'balance'] },
        status: { type: 'string', enum: ['paid', 'open', 'draft', 'void', 'uncollectible'] },
      },
      required: ['action'],
    },
  },
  {
    name: 'query_gmail',
    description: 'Gmail: buscar y leer correos.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Gmail search query' } },
      required: ['query'],
    },
  },
  {
    name: 'query_calendar',
    description: 'Google Calendar: próximos eventos.',
    input_schema: {
      type: 'object',
      properties: { days: { type: 'string', description: 'Days ahead (default 7)' } },
    },
  },
  {
    name: 'query_notes',
    description: 'Notas y recordatorios del usuario (Supabase).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'query_quickbooks',
    description: 'QuickBooks: P&L, balance, clientes, A/R (requiere token OAuth).',
    input_schema: {
      type: 'object',
      properties: {
        report: { type: 'string', enum: ['pnl', 'balance', 'ar_aging', 'customers'] },
      },
    },
  },
];

export const AGENT_SYSTEM_PROMPT = `Eres el agente maestro de Quivo para firmas de contabilidad en EE.UU.

## Herramientas
- query_stripe: pagos, facturas, MRR
- query_gmail / query_calendar: si Google está conectado en Quivo
- query_notes: memoria y notas del cliente
- query_quickbooks: si el usuario configuró token QuickBooks
- PDFs: visión nativa para bank statements → categorías Schedule C

## TaxDome
No tienes API a TaxDome. Cuando el usuario pida algo de TaxDome, explica qué hacer manualmente en el portal (subir docs, firmar, mensajes al cliente).

## Deadlines fiscales (referencia)
- Q1: 15 abr | Q2: 15 jun | Q3: 15 sep | Q4: 15 ene
- S-Corp / Partnership: 15 mar | C-Corp: 15 abr

## Reglas
- Confirma antes de enviar emails o crear cargos
- Si falta una integración, indica cómo conectarla (Settings en Quivo o API Keys del agente)
- Responde en el idioma del usuario
- Sé conciso y accionable`;
