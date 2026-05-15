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
import { exchangeCodeForTokens, getGoogleOAuthConfigSnapshot } from '@/lib/google';
import { logErrorChain } from '@/lib/log-error-chain';
import { verifySignedOAuthState } from '@/lib/oauth-state';

export async function GET(req: NextRequest) {
  console.log('[Google OAuth callback] ── START ──', {
    url: req.nextUrl.pathname,
    hasCode: !!req.nextUrl.searchParams.get('code'),
    hasState: !!req.nextUrl.searchParams.get('state'),
    hasError: !!req.nextUrl.searchParams.get('error'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '(not set)',
    oauth: getGoogleOAuthConfigSnapshot(),
  });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-oauth-callback'));
  if (rlDenied) {
    console.error('[Google OAuth callback] BLOCKED by rate limiter');
    return rlDenied;
  }

  const { searchParams } = req.nextUrl;
  const code    = searchParams.get('code');
  const state   = searchParams.get('state');
  const error   = searchParams.get('error');

  // ── Google returned an error (user denied, etc.) ──────────────────────
  if (error) {
    console.error('[Google OAuth callback] Google returned error:', error);
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', error);
    return NextResponse.redirect(url);
  }

  if (!code || !state) {
    console.error('[Google OAuth callback] Missing code or state', { hasCode: !!code, hasState: !!state });
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'missing_code');
    return NextResponse.redirect(url);
  }

  console.log('[Google OAuth callback] Step 1: verifying state…');
  const clerkUserId = verifySignedOAuthState(state);
  if (!clerkUserId) {
    console.error('[Google OAuth callback] FAILED: invalid_state — token expired or signature mismatch');
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'invalid_state');
    url.searchParams.set('google_detail', 'OAuth state token expired or signature mismatch. Try connecting again.');
    return NextResponse.redirect(url);
  }
  console.log('[Google OAuth callback] Step 1 OK — state userId:', clerkUserId);

  console.log('[Google OAuth callback] Step 2: checking Clerk session…');
  const { userId: sessionUserId } = await auth();
  if (!sessionUserId || sessionUserId !== clerkUserId) {
    console.error('[Google OAuth callback] FAILED: session_mismatch', { sessionUserId, clerkUserId });
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'session_mismatch');
    url.searchParams.set('google_detail', `session=${sessionUserId ?? 'none'} state=${clerkUserId}`);
    return NextResponse.redirect(url);
  }
  console.log('[Google OAuth callback] Step 2 OK — session matches');

  console.log('[Google OAuth callback] Step 3: exchanging code for tokens…');
  try {
    await exchangeCodeForTokens(code, clerkUserId);
    console.log('[Google OAuth callback] ── SUCCESS ── tokens saved for', clerkUserId);
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_connected', '1');
    return NextResponse.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'exchange_failed';
    logErrorChain('[Google OAuth callback] FAILED at Step 3 — full chain:', err);
    const url = new URL('/dashboard', req.url);
    url.searchParams.set('google_error', 'exchange_failed');
    url.searchParams.set('google_detail', msg.slice(0, 200));
    return NextResponse.redirect(url);
  }
}
