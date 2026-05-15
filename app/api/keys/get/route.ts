import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { USER_API_KEYS_TABLE } from '@/lib/user-secret-store';

export type KeyRowPublic = {
  provider: string;
  key_hint: string | null;
  last_used_at: string | null;
  updated_at: string | null;
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse(
    'default',
    await rateLimitKey('keys-get', userId),
  );
  if (rlDenied) return rlDenied;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(USER_API_KEYS_TABLE)
    .select('provider, key_hint, last_used_at, updated_at')
    .eq('user_id', userId);

  if (error) {
    return NextResponse.json({ error: 'Could not load keys' }, { status: 500 });
  }

  const keys: KeyRowPublic[] = (data ?? []).map(r => ({
    provider: r.provider as string,
    key_hint: (r.key_hint as string | null) ?? null,
    last_used_at: (r.last_used_at as string | null) ?? null,
    updated_at: (r.updated_at as string | null) ?? null,
  }));

  return NextResponse.json({ keys });
}
