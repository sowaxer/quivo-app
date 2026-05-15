/** Origins for Clerk JS/API when using a custom Frontend API host (e.g. clerk.quivo.site). */
export function clerkCustomOrigins(): string[] {
  const origins = new Set<string>();

  const addHost = (raw: string | undefined) => {
    if (!raw?.trim()) return;
    try {
      const host = raw.includes('://') ? new URL(raw).host : raw.replace(/\/$/, '');
      if (!host) return;
      origins.add(`https://${host}`);
      origins.add(`wss://${host}`);
    } catch {
      /* ignore malformed */
    }
  };

  for (const key of ['CLERK_DOMAIN', 'NEXT_PUBLIC_CLERK_DOMAIN', 'CLERK_FRONTEND_API']) {
    addHost(process.env[key]);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) {
    try {
      const hostname = new URL(appUrl).hostname.replace(/^www\./, '');
      const root = hostname.startsWith('app.') ? hostname.slice(4) : hostname;
      addHost(`clerk.${root}`);
    } catch {
      /* ignore */
    }
  }

  // Production Clerk satellite (pk_live_* → clerk.quivo.site)
  addHost('clerk.quivo.site');

  return [...origins];
}
