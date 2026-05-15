import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { KEYS_API_PROVIDERS } from '@/lib/keys-api-constants';
import { verifySecretBeforeSave } from '@/lib/provider-key-verify';
import { buildUserKeysPublicPayload } from '@/lib/user-keys-payload';
import { setEncryptedSecret } from '@/lib/user-secret-store';
import { vaultWriteRateProfileFromProvider } from '@/lib/vault-write-rate-profile';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const provider =
    typeof body === 'object' && body !== null && 'provider' in body
      ? String((body as { provider: unknown }).provider ?? '')
      : '';
  const key =
    typeof body === 'object' && body !== null && 'key' in body
      ? String((body as { key: unknown }).key ?? '')
      : '';

  if (!KEYS_API_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const val = key.trim();
  if (!val) {
    return NextResponse.json({ error: 'Key is required' }, { status: 400 });
  }

  const writeProfile = vaultWriteRateProfileFromProvider(provider);
  const rlDenied = await rateLimitExceededResponse(writeProfile, await rateLimitKey('vault-save', userId));
  if (rlDenied) return rlDenied;

  const check = await verifySecretBeforeSave(provider, val);
  if (!check.ok) {
    return NextResponse.json({ error: check.message }, { status: 400 });
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[api/keys/save POST]', { userId, provider, writeProfile });
  }

  try {
    await setEncryptedSecret(userId, provider, val);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Save failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const payload = await buildUserKeysPublicPayload(userId);
  return NextResponse.json({ success: true, ...payload });
}
