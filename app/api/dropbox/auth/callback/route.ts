/**
 * GET /api/dropbox/auth/callback — OAuth redirect target (code exchange + token storage).
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getDropboxOAuthRedirectUri } from '@/lib/dropbox-oauth-redirect';
import { encryptOptionalToken } from '@/lib/encrypted-field';
import { verifySignedOAuthState } from '@/lib/oauth-state';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID ?? '';
const DROPBOX_CLIENT_SECRET = process.env.DROPBOX_CLIENT_SECRET ?? '';

function db() {
  return getSupabaseAdmin();
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin));
  }

  const rlDenied = await rateLimitExceededResponse('strict', await rateLimitKey('dropbox-callback', userId));
  if (rlDenied) {
    return NextResponse.redirect(new URL('/dashboard?dropbox_error=rate_limited', req.nextUrl.origin));
  }

  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const err = searchParams.get('error_description') ?? searchParams.get('error');

  if (err) {
    return NextResponse.redirect(
      new URL(`/dashboard?dropbox_error=${encodeURIComponent(err)}`, req.nextUrl.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL('/dashboard?dropbox_error=missing_code', req.nextUrl.origin));
  }

  const uidFromState = verifySignedOAuthState(state ?? '');
  if (!uidFromState || uidFromState !== userId) {
    return NextResponse.redirect(new URL('/dashboard?dropbox_error=invalid_state', req.nextUrl.origin));
  }

  if (!DROPBOX_CLIENT_ID || !DROPBOX_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/dashboard?dropbox_error=no_client', req.nextUrl.origin));
  }

  try {
    const tokenRes = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_CLIENT_ID,
        client_secret: DROPBOX_CLIENT_SECRET,
        redirect_uri: getDropboxOAuthRedirectUri(),
      }),
    });
    const token = (await tokenRes.json()) as {
      access_token?: string;
      refresh_token?: string;
      account_id?: string;
      error?: string;
      error_description?: string;
    };
    if (!token.access_token) {
      throw new Error(token.error_description ?? token.error ?? 'Token exchange failed');
    }

    let accountEmail: string | null = null;
    let displayName: string | null = null;
    try {
      const accRes = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          'Content-Type': 'application/json',
        },
        body: '{}',
      });
      if (accRes.ok) {
        const acc = (await accRes.json()) as {
          email?: string;
          name?: { display_name?: string };
          account_id?: string;
        };
        accountEmail = typeof acc.email === 'string' ? acc.email : null;
        displayName = typeof acc.name?.display_name === 'string' ? acc.name.display_name : null;
      }
    } catch {
      /* optional profile */
    }

    await db().from('dropbox_tokens').upsert(
      {
        user_id: userId,
        access_token: encryptOptionalToken(token.access_token) as string,
        refresh_token: encryptOptionalToken(token.refresh_token ?? null),
        account_id: token.account_id ?? null,
        account_email: accountEmail,
        account_display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

    return NextResponse.redirect(new URL('/dashboard?dropbox_connected=1', req.nextUrl.origin));
  } catch (e) {
    return NextResponse.redirect(
      new URL(`/dashboard?dropbox_error=${encodeURIComponent(String(e))}`, req.nextUrl.origin),
    );
  }
}
