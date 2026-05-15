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

/** Vault / keys save — 10 writes / hour per user. */
export const keysHourlyRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(10, '1 h'),
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
