import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { deleteSecretByProvider } from '@/lib/user-secret-store';
import { KEYS_API_PROVIDERS } from '@/lib/keys-api-constants';

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse(
    'default',
    await rateLimitKey('keys-delete', userId),
  );
  if (rlDenied) return rlDenied;

  const provider = req.nextUrl.searchParams.get('provider') ?? '';
  if (!KEYS_API_PROVIDERS.has(provider)) {
    return NextResponse.json({ error: 'Invalid or missing provider' }, { status: 400 });
  }

  try {
    await deleteSecretByProvider(userId, provider);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
