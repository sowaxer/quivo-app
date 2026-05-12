import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { aiRatelimit, ratelimit, strictRatelimit } from '@/lib/ratelimit';

export type ApiRateLimitProfile = 'default' | 'ai' | 'strict';

const byProfile = {
  default: ratelimit,
  ai: aiRatelimit,
  strict: strictRatelimit,
} as const;

export async function clientIp(): Promise<string> {
  const h = await headers();
  const xf = h.get('x-forwarded-for');
  return xf?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? '127.0.0.1';
}

/**
 * Build a stable rate-limit key. Prefer authenticated user id to avoid shared-IP buckets.
 */
export async function rateLimitKey(routeTag: string, userId?: string | null): Promise<string> {
  if (userId) return `${routeTag}:u:${userId}`;
  const ip = await clientIp();
  return `${routeTag}:ip:${ip}`;
}

export async function rateLimitExceededResponse(
  profile: ApiRateLimitProfile,
  identifier: string,
): Promise<NextResponse | null> {
  const limiter = byProfile[profile];
  const { success, limit, reset, remaining, pending } = await limiter.limit(identifier);
  void pending?.catch(() => {});
  if (success) return null;
  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
      },
    },
  );
}
