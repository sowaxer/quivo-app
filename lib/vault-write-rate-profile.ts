import type { ApiRateLimitProfile } from '@/lib/api-rate-limit';
import { fieldToProvider } from '@/lib/user-secret-store';

const SECRET_BODY_FIELDS = [
  'anthropic_key',
  'openai_key',
  'google_ai_key',
  'deepseek_key',
  'stripe_secret',
  'stripe_pub',
  'tavily_key',
  'notion_token',
] as const;

/** Pick a looser limiter for publishable Stripe keys, tighter bucket for bulk vault writes. */
export function vaultWriteRateProfile(body: Record<string, unknown>): ApiRateLimitProfile {
  const providers: string[] = [];
  for (const field of SECRET_BODY_FIELDS) {
    if (!(field in body) || typeof body[field] !== 'string') continue;
    const val = (body[field] as string).trim();
    if (!val) continue;
    const p = fieldToProvider(field);
    if (p) providers.push(p);
  }

  if (providers.length === 0) {
    if ('preferences' in body && body.preferences !== undefined) return 'default';
    return 'keysHourly';
  }
  if (providers.length === 1 && providers[0] === 'stripe_publishable') return 'publicKeyMinute';
  if (providers.length === 1 && providers[0] === 'stripe_secret') return 'stripeMinute';
  return 'keysHourly';
}

export function vaultWriteRateProfileFromProvider(provider: string): ApiRateLimitProfile {
  if (provider === 'stripe_publishable') return 'publicKeyMinute';
  if (provider === 'stripe_secret') return 'stripeMinute';
  return 'keysHourly';
}
