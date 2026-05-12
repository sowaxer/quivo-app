import Stripe from 'stripe';

const API_VERSION = '2026-04-22.dahlia' as const;

/** Platform Stripe (env). User vault keys stay in `/api/stripe` via `getDecryptedSecret`. */
export function createStripeClient(secretKey: string): Stripe {
  return new Stripe(secretKey, { apiVersion: API_VERSION, typescript: true });
}
