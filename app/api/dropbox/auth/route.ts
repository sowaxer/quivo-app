/**
 * GET  /api/dropbox/auth           → redirect to Dropbox OAuth
 * GET  /api/dropbox/auth?status=1  → return { connected: boolean }
 * GET  /api/dropbox/auth?code=...  → exchange code for token (callback)
 * DELETE /api/dropbox/auth         → revoke token
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createSignedOAuthState, verifySignedOAuthState } from '@/lib/oauth-state';

const DROPBOX_CLIENT_ID     = process.env.DROPBOX_CLIENT_ID ?? '';
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET ?? '';

function getRedirectUri() {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/dropbox/auth`;
}

function db() {
  return getSupabaseAdmin();
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('dropbox-auth', userId));
  if (rlDenied) return rlDenied;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const code   = searchParams.get('code');

  // Status check
  if (status === '1') {
    const { data } = await db().from('dropbox_tokens').select('user_id').eq('user_id', userId).single();
    return NextResponse.json({ connected: !!data });
  }

  // OAuth callback
  if (code) {
    if (!DROPBOX_CLIENT_ID) return NextResponse.redirect(new URL('/dashboard?dropbox_error=no_client_id', req.nextUrl.origin));
    try {
      const res = await fetch('https://api.dropboxapi.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: DROPBOX_CLIENT_ID,
          client_secret: DROPBOX_CLIENT_SECRET,
          redirect_uri: getRedirectUri(),
        }),
      });
      const token = await res.json();
      if (!token.access_token) throw new Error(token.error_description ?? 'Token exchange failed');

      await db().from('dropbox_tokens').upsert({
        user_id: userId,
        access_token: token.access_token,
        refresh_token: token.refresh_token ?? null,
        account_id: token.account_id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

      return NextResponse.redirect(new URL('/dashboard?dropbox_connected=1', req.nextUrl.origin));
    } catch (e) {
      return NextResponse.redirect(new URL(`/dashboard?dropbox_error=${encodeURIComponent(String(e))}`, req.nextUrl.origin));
    }
  }

  // No client ID configured — show instructions
  if (!DROPBOX_CLIENT_ID) {
    return NextResponse.json({
      error: 'DROPBOX_CLIENT_ID not set. Add it to .env.local. Get it at https://www.dropbox.com/developers/apps'
    }, { status: 500 });
  }

  // Initiate OAuth
  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.searchParams.set('client_id', DROPBOX_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', getRedirectUri());
  url.searchParams.set('token_access_type', 'offline');
  url.searchParams.set('state', createSignedOAuthState(userId));
  return NextResponse.redirect(url.toString());
}

export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('dropbox-auth-del', userId));
  if (rlDenied) return rlDenied;
  await db().from('dropbox_tokens').delete().eq('user_id', userId);
  return NextResponse.json({ success: true });
}
