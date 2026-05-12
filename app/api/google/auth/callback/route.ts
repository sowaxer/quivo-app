/**
 * Google OAuth 2.0 callback handler
 *
 * Google redirects here after the user consents:
 *   GET /api/google/auth/callback?code=...&state=<userId>
 *
 * On success → redirect to /dashboard?google_connected=1
 * On error   → redirect to /dashboard?google_error=<reason>
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { exchangeCodeForTokens } from '@/lib/google';
import { verifySignedOAuthState } from '@/lib/oauth-state';

export async function GET(req: NextRequest) {
  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('google-oauth-callback'));
  if (rlDenied) return rlDenied;

  const { searchParams } = req.nextUrl;
  const code    = searchParams.get('code');
  const state   = searchParams.get('state');
  const error   = searchParams.get('error');

  // ── Google returned an error (user denied, etc.) ──────────────────────
  if (error) {
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', error);
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'missing_code');
    return NextResponse.redirect(url);
  }

  const clerkUserId = verifySignedOAuthState(state);
  if (!clerkUserId) {
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'invalid_state');
    return NextResponse.redirect(url);
  }

  const { userId: sessionUserId } = await auth();
  if (!sessionUserId || sessionUserId !== clerkUserId) {
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'session_mismatch');
    return NextResponse.redirect(url);
  }

  try {
    await exchangeCodeForTokens(code, clerkUserId);
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_connected', '1');
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'exchange_failed';
    console.error('[Google OAuth callback] token exchange failed:', msg);
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'exchange_failed');
    return NextResponse.redirect(url);
  }
}
