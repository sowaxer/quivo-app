/**
 * Google OAuth 2.0 — initiation + utilities
 *
 * GET  /api/google/auth               → redirect to Google consent screen
 * GET  /api/google/auth?status=1      → return { connected: boolean }
 * DELETE /api/google/auth             → revoke tokens (disconnect)
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getAuthUrl, isConnected, revokeTokens } from '@/lib/google';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('google-auth', userId));
  if (rlDenied) return rlDenied;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');

  // ── Connection status check ──────────────────────────────────────────
  if (status === '1') {
    const connected = await isConnected(userId);
    return NextResponse.json({ connected });
  }

  // ── Initiate OAuth flow — signed state binds tokens to this Clerk session
  try {
    const consentUrl = getAuthUrl(userId);
    return NextResponse.redirect(consentUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'OAuth config error';
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', msg);
    return NextResponse.redirect(url);
  }
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('google-auth-del', userId));
  if (rlDenied) return rlDenied;
  await revokeTokens(userId);
  return NextResponse.json({ success: true });
}
