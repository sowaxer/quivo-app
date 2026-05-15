import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

/** General API traffic (per identifier). */
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
});

/** Anthropic / OpenAI / Gemini — key test, KB extract, non-chat model calls (10 / min). */
export const aiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
});

/** Chat streaming endpoint (20 / min per user). */
export const chatRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  analytics: true,
});

/** Vault / keys save — 50 writes / hour per user (bulk or multi-provider saves). */
export const keysHourlyRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(50, '1 h'),
  analytics: true,
});

/** Stripe secret key saves — 20 / minute per user. */
export const stripeVaultMinuteRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '60 s'),
  analytics: true,
});

/** Publishable / public keys (e.g. Stripe pk_*) — 30 / minute per user. */
export const publicKeyMinuteRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'),
  analytics: true,
});

/** GET user-keys / presence — high read budget to avoid 429 after saves or parallel panels. */
export const vaultReadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '60 s'),
  analytics: true,
});

/** Shared budget for Gmail + Calendar + Drive (30 / min per user). */
export const googleIntegrationRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '60 s'),
  analytics: true,
});

/** OAuth starts, Stripe operations, webhooks. */
export const strictRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
});
