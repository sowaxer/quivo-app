import { getDecryptedSecret } from '@/lib/user-secret-store';

/**
 * User-owned provider keys only (vault). Never read platform ANTHROPIC_* from env.
 */
export async function getUserAnthropicKey(
  userId: string,
  headerKey?: string | null,
): Promise<string | null> {
  const fromHeader = headerKey?.trim();
  if (fromHeader) return fromHeader;
  return getDecryptedSecret(userId, 'anthropic');
}

export async function getUserStripeSecretKey(
  userId: string,
  headerKey?: string | null,
): Promise<string | null> {
  const fromHeader = headerKey?.trim();
  if (fromHeader) return fromHeader;
  return getDecryptedSecret(userId, 'stripe_secret');
}
