/**
 * GET /api/google/debug
 *
 * Authenticated diagnostics for Google OAuth + Supabase (no secret values).
 * Compare `serviceRoleKeyFingerprint` with a local hash of the key from
 * Supabase Dashboard → Settings → API → service_role.
 *
 * Example (same fingerprint the server uses):
 *   node -e "const c=require('crypto');const k=process.env.K;console.log(c.createHash('sha256').update(k,'utf8').digest('hex').slice(0,16))" <<<"$SUPABASE_SERVICE_ROLE_KEY"
 */

import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-server';

function fingerprint(secret: string): string {
  return createHash('sha256').update(secret, 'utf8').digest('hex').slice(0, 16);
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rlDenied = await rateLimitExceededResponse(
    'default',
    await rateLimitKey('google-debug', userId),
  );
  if (rlDenied) return rlDenied;

  const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? '';
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? '';
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '';
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';

  const envPresence = {
    GOOGLE_CLIENT_ID: googleClientId.length > 0,
    GOOGLE_CLIENT_SECRET: googleClientSecret.length > 0,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole.length > 0,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.length > 0,
    NEXT_PUBLIC_APP_URL: Boolean(process.env.NEXT_PUBLIC_APP_URL?.trim()),
  };

  let supabaseSelect: {
    ok: boolean;
    error?: { message: string; code?: string; details?: string; hint?: string };
    sampleRowCount?: number;
    /** Total rows in `google_tokens` when the driver returns `count`. */
    totalRowCount?: number | null;
  };

  if (!serviceRole || !supabaseUrl) {
    supabaseSelect = {
      ok: false,
      error: {
        message: 'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
      },
    };
  } else {
    try {
      const db = getSupabaseAdmin();
      const { data, error, count } = await db
        .from('google_tokens')
        .select('user_id', { count: 'exact', head: false })
        .limit(1);

      if (error) {
        supabaseSelect = {
          ok: false,
          error: {
            message: error.message,
            code: error.code,
            details: error.details ?? undefined,
            hint: error.hint ?? undefined,
          },
        };
      } else {
        supabaseSelect = {
          ok: true,
          sampleRowCount: data?.length ?? 0,
          totalRowCount: count ?? null,
        };
      }
    } catch (e) {
      supabaseSelect = {
        ok: false,
        error: { message: e instanceof Error ? e.message : String(e) },
      };
    }
  }

  const serviceRoleFingerprint =
    serviceRole.length > 0 ? fingerprint(serviceRole) : null;

  return NextResponse.json({
    userId,
    envPresence,
    /** First 16 hex chars of SHA-256(service_role key). Compare with the key from Supabase (hash locally, do not paste the key into client-side tools). */
    serviceRoleKeyFingerprint: serviceRoleFingerprint,
    serviceRoleKeyLength: serviceRole.length > 0 ? serviceRole.length : undefined,
    supabaseSelect,
    note:
      'We cannot read Vercel deployment logs from this app. Open Vercel → Project → Logs and filter for [Google OAuth callback].',
  });
}
