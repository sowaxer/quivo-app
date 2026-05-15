/** Dropbox OAuth redirect URI — must match the app console exactly (path includes `/callback`). */
export function getDropboxOAuthRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/api/dropbox/auth/callback`;
}
