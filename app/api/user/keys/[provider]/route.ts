import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { deleteSecretByProvider } from '@/lib/user-secret-store';

const ALLOWED = new Set([
  'anthropic',
  'openai',
  'google_ai',
  'stripe_secret',
  'stripe_publishable',
  'tavily',
  'notion',
]);

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ provider: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('user-keys-provider-del', userId));
  if (rlDenied) return rlDenied;

  const { provider } = await ctx.params;
  const p = decodeURIComponent(provider);
  if (!ALLOWED.has(p)) {
    return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
  }

  await deleteSecretByProvider(userId, p);
  return NextResponse.json({ success: true });
}
