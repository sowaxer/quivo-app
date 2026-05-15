import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ─── IP extraction (Edge-safe) ───────────────────────────────────────────────
function clientIp(request: NextRequest): string {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || '127.0.0.1';
  const real = request.headers.get('x-real-ip');
  if (real) return real.trim();
  return '127.0.0.1';
}

function hasUpstashEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim(),
  );
}

let redisSingleton: Redis | null | undefined;
function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  if (!hasUpstashEnv()) {
    redisSingleton = null;
    return null;
  }
  redisSingleton = Redis.fromEnv();
  return redisSingleton;
}

let globalLimit: Ratelimit | null | undefined;
function getGlobalRatelimit(): Ratelimit | null {
  if (globalLimit !== undefined) return globalLimit;
  const redis = getRedis();
  if (!redis) {
    globalLimit = null;
    return null;
  }
  globalLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    prefix: 'edge-ddos',
  });
  return globalLimit;
}

let authLimit: Ratelimit | null | undefined;
function getAuthRatelimit(): Ratelimit | null {
  if (authLimit !== undefined) return authLimit;
  const redis = getRedis();
  if (!redis) {
    authLimit = null;
    return null;
  }
  authLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    prefix: 'edge-auth',
  });
  return authLimit;
}

function skipGlobalDdos(pathname: string): boolean {
  if (pathname.startsWith('/api/webhooks')) return true;
  if (pathname.startsWith('/api/internal/security-log')) return true;
  return false;
}

/** Clerk session traffic — do not apply sign-in page rate limits here. */
function isClerkProxyPath(pathname: string): boolean {
  return pathname === '/__clerk' || pathname.startsWith('/__clerk/');
}

/** Brute-force guard for Clerk backend routes only (not /sign-in UI). */
function isAuthApiSurface(pathname: string): boolean {
  return pathname.startsWith('/api/auth');
}

function retryAfterSeconds(resetMs: number): string {
  return String(Math.max(1, Math.ceil((resetMs - Date.now()) / 1000)));
}

const BLOCK_SECONDS = 900;

async function notifySecurityLog(
  request: NextRequest,
  payload: { event_type: string; ip: string; path: string; detail?: string },
): Promise<void> {
  const secret = process.env.INTERNAL_SECURITY_LOG_SECRET?.trim();
  if (!secret) return;
  const url = new URL('/api/internal/security-log', request.nextUrl.origin);
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 4000);
  try {
    await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: ac.signal,
    });
  } catch {
    /* ignore */
  } finally {
    clearTimeout(t);
  }
}

// Routes that do NOT require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
  '/api/internal/security-log(.*)',
]);

const isApiRoute = createRouteMatcher(['/api/(.*)']);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  const ip = clientIp(request);
  const pathname = request.nextUrl.pathname;
  const redis = getRedis();

  // ── 1) Global IP rate limit (100 / 60s) — all matched routes except webhooks ──
  if (!skipGlobalDdos(pathname)) {
    const gl = getGlobalRatelimit();
    if (gl) {
      const { success, reset, pending } = await gl.limit(`ip:${ip}`);
      void pending?.catch(() => {});
      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': retryAfterSeconds(reset) },
        });
      }
    }
  }

  // ── 2) Clerk API brute-force guard (5/min) — never throttle /sign-in or /__clerk proxy ──
  if (isAuthApiSurface(pathname) && !isClerkProxyPath(pathname) && redis) {
    const blocked = await redis.get(`auth-ip-block:${ip}`);
    if (blocked) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: { 'Retry-After': String(BLOCK_SECONDS) },
      });
    }
    const al = getAuthRatelimit();
    if (al) {
      const { success, reset, pending } = await al.limit(`auth:${ip}`);
      void pending?.catch(() => {});
      if (!success) {
        await redis.set(`auth-ip-block:${ip}`, '1', { ex: BLOCK_SECONDS });
        void notifySecurityLog(request, {
          event_type: 'auth_brute_threshold',
          ip,
          path: pathname,
          detail: 'Auth-surface rate limit exceeded; IP blocked 15m',
        });
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': String(BLOCK_SECONDS) },
        });
      }
    }
  }

  const { userId } = await auth();

  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  if (isApiRoute(request) && !isPublicRoute(request) && !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (userId && (pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up'))) {
    return NextResponse.redirect(new URL('/dashboard?view=overview', request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
    '/(api|trpc)(.*)',
  ],
};
