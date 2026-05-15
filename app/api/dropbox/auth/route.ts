/**
 * GET  /api/dropbox/auth           → redirect to Dropbox OAuth
 * GET  /api/dropbox/auth?status=1  → return { connected, email?, name? }
 * DELETE /api/dropbox/auth         → revoke token
 */
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getDropboxOAuthRedirectUri } from '@/lib/dropbox-oauth-redirect';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { createSignedOAuthState } from '@/lib/oauth-state';

const DROPBOX_CLIENT_ID = process.env.DROPBOX_CLIENT_ID ?? '';

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

  if (status === '1') {
    const { data } = await db()
      .from('dropbox_tokens')
      .select('user_id, account_email, account_display_name')
      .eq('user_id', userId)
      .maybeSingle();
    return NextResponse.json({
      connected: !!data,
      email: data?.account_email ?? null,
      name: data?.account_display_name ?? null,
    });
  }

  if (!DROPBOX_CLIENT_ID.trim()) {
    return NextResponse.json(
      {
        error:
          'DROPBOX_CLIENT_ID not set. Add it to .env.local or Vercel. Get it at https://www.dropbox.com/developers/apps',
      },
      { status: 500 },
    );
  }

  const url = new URL('https://www.dropbox.com/oauth2/authorize');
  url.searchParams.set('client_id', DROPBOX_CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', getDropboxOAuthRedirectUri());
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
