/**
 * Google OAuth 2.0 helper for Finedge.
 *
 * Token lifecycle:
 *  1. /api/google/auth          → build the consent URL (server-side)
 *  2. /api/google/auth/callback → exchange code for tokens, store in Supabase
 *  3. getAuthClient(userId)      → retrieve stored tokens, auto-refresh, return OAuth2Client
 */

import { google } from 'googleapis';
import type { OAuth2Client, Credentials } from 'google-auth-library';
import { createSignedOAuthState } from '@/lib/oauth-state';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// ─── Constants ────────────────────────────────────────────────────────────────
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.email',
  'openid',
];

// ─── Supabase (service-role, server-only) ─────────────────────────────────────
function getSupabase() {
  return getSupabaseAdmin();
}

// ─── Build an OAuth2Client (no credentials yet) ───────────────────────────────
export function createOAuthClient(): OAuth2Client {
  // Use NEXT_PUBLIC_APP_URL as the canonical base so the redirect URI
  // always matches exactly what is registered in Google Cloud Console.
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  const redirectUri = `${base}/api/google/auth/callback`;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    redirectUri,
  );
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
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  await saveTokens(userId, tokens);
  return tokens;
}

// ─── Persist tokens ───────────────────────────────────────────────────────────
export async function saveTokens(userId: string, tokens: Credentials) {
  const supabase = getSupabase();
  await supabase.from('google_tokens').upsert(
    {
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
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
  return {
    access_token:  data.access_token,
    refresh_token: data.refresh_token,
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

  // If access_token is about to expire, refresh proactively
  const expiresIn = (tokens.expiry_date ?? 0) - Date.now();
  if (expiresIn < 5 * 60 * 1000) {
    try {
      const { credentials } = await client.refreshAccessToken();
      await saveTokens(userId, credentials);
      client.setCredentials(credentials);
    } catch {
      // refresh failed – tokens are revoked
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
