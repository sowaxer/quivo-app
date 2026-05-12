import { createHmac, timingSafeEqual } from 'crypto';

const PREFIX = 'fe_oauth_v1';

function signingSecret(): string {
  return process.env.OAUTH_STATE_SECRET ?? process.env.CLERK_SECRET_KEY ?? '';
}

/**
 * Signed, time-limited OAuth `state` to prevent cross-account token binding.
 * Uses OAUTH_STATE_SECRET if set, otherwise CLERK_SECRET_KEY (must be set in production).
 */
export function createSignedOAuthState(clerkUserId: string, ttlSec = 900): string {
  if (!/^user_[a-zA-Z0-9]+$/.test(clerkUserId)) {
    throw new Error('Invalid Clerk user id for OAuth state');
  }
  const secret = signingSecret();
  if (!secret) {
    throw new Error('Set CLERK_SECRET_KEY (or OAUTH_STATE_SECRET) to sign OAuth state');
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const payload = `${clerkUserId}|${exp}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  const inner = `${PREFIX}|${payload}|${sig}`;
  return Buffer.from(inner, 'utf8').toString('base64url');
}

export function verifySignedOAuthState(token: string): string | null {
  try {
    const secret = signingSecret();
    if (!secret) return null;
    const inner = Buffer.from(token, 'base64url').toString('utf8');
    const parts = inner.split('|');
    if (parts.length !== 4 || parts[0] !== PREFIX) return null;
    const clerkUserId = parts[1];
    const exp = Number(parts[2]);
    const sig = parts[3];
    if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
    if (!/^user_[a-zA-Z0-9]+$/.test(clerkUserId)) return null;
    const payload = `${clerkUserId}|${exp}`;
    const expect = createHmac('sha256', secret).update(payload).digest('hex');
    const a = Buffer.from(sig, 'utf8');
    const b = Buffer.from(expect, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return clerkUserId;
  } catch {
    return null;
  }
}
