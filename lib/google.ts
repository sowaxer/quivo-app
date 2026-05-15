/**
 * Google OAuth 2.0 helper for Quivo.
 *
 * Token lifecycle:
 *  1. /api/google/auth          → build the consent URL (server-side)
 *  2. /api/google/auth/callback → exchange code for tokens, store in Supabase
 *  3. getAuthClient(userId)      → retrieve stored tokens, auto-refresh, return OAuth2Client
 */

import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { createSignedOAuthState } from '@/lib/oauth-state';
import { logErrorChain } from '@/lib/log-error-chain';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { encryptOptionalToken, decryptOptionalToken } from '@/lib/encrypted-field';

// ─── Constants ────────────────────────────────────────────────────────────────
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

// ─── Supabase (service-role, server-only) ─────────────────────────────────────
function getSupabase() {
  return getSupabaseAdmin();
}

/** Which env var supplied the OAuth redirect URI (must match Google Cloud Console). */
export type GoogleOAuthRedirectSource =
  | 'GOOGLE_OAUTH_REDIRECT_URI'
  | 'NEXT_PUBLIC_GOOGLE_REDIRECT_URI'
  | 'NEXT_PUBLIC_APP_URL'
  | 'VERCEL_URL'
  | 'default_localhost';

function normalizeOAuthRedirectUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return u;
  if (u.endsWith('/') && !u.endsWith('//')) return u.slice(0, -1);
  return u;
}

/**
 * Single redirect_uri for both authorize and token exchange.
 * Prefer `GOOGLE_OAUTH_REDIRECT_URI` in production so it matches Google Console byte-for-byte.
 */
export function getGoogleOAuthRedirectUri(): { uri: string; source: GoogleOAuthRedirectSource } {
  const explicitServer = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (explicitServer) {
    return { uri: normalizeOAuthRedirectUrl(explicitServer), source: 'GOOGLE_OAUTH_REDIRECT_URI' };
  }

  const explicitPublic = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI?.trim();
  if (explicitPublic) {
    return { uri: normalizeOAuthRedirectUrl(explicitPublic), source: 'NEXT_PUBLIC_GOOGLE_REDIRECT_URI' };
  }

  const app = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (app) {
    const base = app.replace(/\/$/, '');
    return { uri: `${base}/api/google/auth/callback`, source: 'NEXT_PUBLIC_APP_URL' };
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, '');
    return { uri: `https://${host}/api/google/auth/callback`, source: 'VERCEL_URL' };
  }

  return { uri: 'http://localhost:3000/api/google/auth/callback', source: 'default_localhost' };
}

/** Safe for server logs — never includes full client secret or auth code. */
export function getGoogleOAuthConfigSnapshot(): {
  clientId: string;
  clientSecretLength: number;
  clientSecretPreview: string;
  redirectUri: string;
  redirectUriSource: GoogleOAuthRedirectSource;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const { uri, source } = getGoogleOAuthRedirectUri();
  return {
    clientId,
    clientSecretLength: secret.length,
    clientSecretPreview:
      secret.length > 8 ? `${secret.slice(0, 4)}…${secret.slice(-4)}` : secret.length ? '***' : '(empty)',
    redirectUri: uri,
    redirectUriSource: source,
  };
}

// ─── Build an OAuth2Client (no credentials yet) ───────────────────────────────
export function createOAuthClient(): OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set (server env only — do not use NEXT_PUBLIC_). ' +
      'Add them in .env.local (local) or Vercel Environment Variables (production).',
    );
  }
  const { uri: redirectUri } = getGoogleOAuthRedirectUri();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// ─── Generate the Google consent URL ─────────────────────────────────────────
export function getAuthUrl(clerkUserId: string): string {
  const client = createOAuthClient();
  const state = createSignedOAuthState(clerkUserId);
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',        // always return refresh_token
    scope: GOOGLE_SCOPES,
    state,
  });
}

// ─── Exchange auth code → tokens, save to Supabase ───────────────────────────
export async function exchangeCodeForTokens(
  code: string,
  userId: string,
): Promise<Credentials> {
  const snap = getGoogleOAuthConfigSnapshot();
  const client = createOAuthClient();

  console.log('[Google OAuth] Token exchange — resolved config (sanitized):', {
    userId,
    clientId: snap.clientId,
    clientSecretLength: snap.clientSecretLength,
    clientSecretPreview: snap.clientSecretPreview,
    redirectUri: snap.redirectUri,
    redirectUriSource: snap.redirectUriSource,
    note: 'OAuth2Client uses this same redirect_uri for authorize URL and token exchange',
    codeLength: code.length,
  });
  console.log(
    '[Google OAuth] POST https://oauth2.googleapis.com/token body fields (values omitted): ' +
      'grant_type=authorization_code, code, redirect_uri, client_id, client_secret',
  );

  let tokens: Credentials;
  try {
    const res = await client.getToken(code);
    tokens = res.tokens;
  } catch (err) {
    logErrorChain('[Google OAuth] getToken() FAILED — full chain:', err);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Token exchange failed: ${msg}`, { cause: err });
  }

  console.log('[Google OAuth] tokens received:', {
    hasAccessToken: Boolean(tokens.access_token),
    hasRefreshToken: Boolean(tokens.refresh_token),
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
  });

  let accountEmail: string | null = null;
  if (tokens.access_token) {
    try {
      const r = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (r.ok) {
        const u = (await r.json()) as { email?: string };
        accountEmail = typeof u.email === 'string' ? u.email : null;
      }
    } catch {
      /* non-fatal */
    }
  }

  await saveTokens(userId, tokens, accountEmail);
  return tokens;
}

// ─── Persist tokens ───────────────────────────────────────────────────────────
export async function saveTokens(
  userId: string,
  tokens: Credentials,
  accountEmail?: string | null,
) {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('google_tokens')
    .select('access_token, refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  let accessPlain = tokens.access_token ?? null;
  let refreshPlain = tokens.refresh_token ?? null;

  if (existing) {
    if (!accessPlain && existing.access_token) {
      accessPlain = decryptOptionalToken(existing.access_token as string);
    }
    if (!refreshPlain && existing.refresh_token) {
      refreshPlain = decryptOptionalToken(existing.refresh_token as string);
    }
  }

  if (!accessPlain) {
    throw new Error('Cannot persist Google tokens without access_token');
  }

  const row: Record<string, unknown> = {
    user_id: userId,
    access_token: encryptOptionalToken(accessPlain),
    refresh_token: refreshPlain != null && refreshPlain !== ''
      ? encryptOptionalToken(refreshPlain)
      : existing?.refresh_token ?? null,
    expiry_date: tokens.expiry_date,
    token_type: tokens.token_type,
    scope: tokens.scope,
    updated_at: new Date().toISOString(),
  };
  if (accountEmail) row.account_email = accountEmail;

  console.log('[Google OAuth] saving tokens to Supabase…', { userId });

  const { error } = await supabase
    .from('google_tokens')
    .upsert(row, { onConflict: 'user_id' });

  if (error) {
    console.error('[Google OAuth] Supabase upsert FAILED:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Supabase save failed: ${error.message} (${error.code})`, {
      cause: error,
    });
  }

  console.log('[Google OAuth] tokens saved successfully for', userId);
}

// ─── Load tokens from Supabase ────────────────────────────────────────────────
export async function loadTokens(userId: string): Promise<Credentials | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  const at = decryptOptionalToken(data.access_token as string);
  const rt = decryptOptionalToken(data.refresh_token as string | null);
  if (!at) return null;
  return {
    access_token:  at,
    refresh_token: rt ?? undefined,
    expiry_date:   data.expiry_date,
    token_type:    data.token_type,
    scope:         data.scope,
  };
}

// ─── Delete tokens (disconnect) ───────────────────────────────────────────────
export async function revokeTokens(userId: string) {
  const supabase = getSupabase();
  const tokens = await loadTokens(userId);
  if (tokens?.access_token) {
    const client = createOAuthClient();
    client.setCredentials(tokens);
    try { await client.revokeToken(tokens.access_token); } catch { /* ignore */ }
  }
  await supabase.from('google_tokens').delete().eq('user_id', userId);
}

// ─── Return a ready-to-use OAuth2Client (auto-refreshes if expired) ───────────
export async function getAuthClient(userId: string): Promise<OAuth2Client | null> {
  const tokens = await loadTokens(userId);
  if (!tokens?.refresh_token) return null;

  const client = createOAuthClient();
  client.setCredentials(tokens);

  // If access_token is about to expire (or we have no expiry), refresh proactively
  const expiresIn = (tokens.expiry_date ?? 0) - Date.now();
  const expiryUnknownOrStale = !tokens.expiry_date || tokens.expiry_date <= 0 || expiresIn < 5 * 60 * 1000;
  if (expiryUnknownOrStale) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await saveTokens(userId, credentials);
      client.setCredentials(credentials);
    } catch (e) {
      console.error('[Google] refreshAccessToken failed for user', userId, e);
      // refresh failed – tokens are revoked or invalid_grant
      return null;
    }
  }

  return client;
}

// ─── Check connection status ──────────────────────────────────────────────────
export async function isConnected(userId: string): Promise<boolean> {
  const tokens = await loadTokens(userId);
  return !!tokens?.refresh_token;
}

/** Google account email stored after OAuth (for Settings UI). */
export async function getGoogleAccountEmail(userId: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('google_tokens')
    .select('account_email')
    .eq('user_id', userId)
    .maybeSingle();
  const e = data?.account_email;
  return typeof e === 'string' && e.length > 0 ? e : null;
}
