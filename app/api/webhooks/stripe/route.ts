/**
 * Platform Stripe webhooks (optional).
 * Set STRIPE_WEBHOOK_SECRET + STRIPE_SECRET_KEY for Finedge billing events.
 * User-connected Stripe accounts use their own keys in /api/stripe — not this route.
 */
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { createStripeClient } from '@/lib/stripe';

export async function POST(req: NextRequest) {
  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('stripe-webhook'));
  if (rlDenied) return rlDenied;

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!whSecret || !apiKey) {
    return NextResponse.json(
      { error: 'Stripe webhooks not configured', hint: 'Set STRIPE_WEBHOOK_SECRET and STRIPE_SECRET_KEY for platform billing.' },
      { status: 501 },
    );
  }

  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const stripe = createStripeClient(apiKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid signature';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Handle events here when you add platform billing (checkout.session.completed, etc.)
  return NextResponse.json({ received: true, type: event.type });
}
