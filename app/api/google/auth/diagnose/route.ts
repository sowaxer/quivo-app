/**
 * GET /api/google/auth/diagnose
 * Returns a checklist of everything needed for Google OAuth to work.
 */
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getGoogleOAuthConfigSnapshot, getGoogleOAuthRedirectUri } from '@/lib/google';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('google-diagnose', userId));
  if (rlDenied) return rlDenied;

  const checks: { label: string; ok: boolean; note?: string }[] = [];

  // 1. Client ID set
  const hasClientId = !!process.env.GOOGLE_CLIENT_ID?.trim();
  checks.push({
    label: 'GOOGLE_CLIENT_ID',
    ok: hasClientId,
    note: hasClientId ? 'set (value hidden)' : 'Missing',
  });

  // 2. Client secret set
  checks.push({ label: 'GOOGLE_CLIENT_SECRET in .env.local', ok: !!process.env.GOOGLE_CLIENT_SECRET, note: process.env.GOOGLE_CLIENT_SECRET ? '✓ set' : 'Missing' });

  // 3. Redirect URI (must match Google Cloud Console exactly)
  const { uri: redirectUri, source: redirectSource } = getGoogleOAuthRedirectUri();
  const snap = getGoogleOAuthConfigSnapshot();
  checks.push({
    label: 'OAuth redirect URI resolution',
    ok: !!redirectUri,
    note: `${redirectUri} (source: ${redirectSource})`,
  });
  checks.push({
    label: 'NEXT_PUBLIC_APP_URL',
    ok: !!process.env.NEXT_PUBLIC_APP_URL?.trim(),
    note: process.env.NEXT_PUBLIC_APP_URL?.trim() ?? '(not set)',
  });
  checks.push({
    label: 'GOOGLE_OAUTH_REDIRECT_URI (optional; use in prod for exact Console match)',
    ok: true,
    note: process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? '(not set — using NEXT_PUBLIC_APP_URL / VERCEL_URL / localhost)',
  });

  // 4. google_tokens table exists
  let tableExists = false;
  try {
    const db = getSupabaseAdmin();
    const { error } = await db.from('google_tokens').select('user_id').limit(1);
    tableExists = !error;
  } catch { tableExists = false; }
  checks.push({ label: 'google_tokens table in Supabase', ok: tableExists, note: tableExists ? '✓ table exists' : 'Run the migration SQL in supabase/migrations/20260509_google_tokens.sql' });

  // 5. Current user has tokens
  let hasTokens = false;
  if (tableExists) {
    try {
      const db = getSupabaseAdmin();
      const { data } = await db.from('google_tokens').select('refresh_token').eq('user_id', userId).single();
      hasTokens = !!data?.refresh_token;
    } catch { hasTokens = false; }
  }
  checks.push({ label: 'Your Google tokens saved', ok: hasTokens, note: hasTokens ? '✓ connected' : 'Not connected yet — click "Connect Google Workspace"' });

  const allOk = checks.every(c => c.ok);

  return NextResponse.json({
    userId,
    redirectUri,
    redirectUriSource: redirectSource,
    oauthClientId: snap.clientId,
    clientSecretLength: snap.clientSecretLength,
    clientSecretPreview: snap.clientSecretPreview,
    allOk,
    checks,
    nextStep: allOk
      ? 'Everything is configured! Google Workspace is ready.'
      : tableExists && !hasTokens
        ? `Go to: ${redirectUri.replace('/api/google/auth/callback', '/api/google/auth')} to connect`
        : !tableExists
          ? 'Run migration SQL for google_tokens table in Supabase first'
          : 'Check .env.local for GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
  });
}
