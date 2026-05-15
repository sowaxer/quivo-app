/**
 * /api/user-keys — legacy path (backward compatible).
 *
 * GET    → has-flags + preferences + key previews (last 4 chars only)
 * POST   → verify then encrypt secrets into user_api_key_vault
 * DELETE → body { field } — removes vault secret for that field
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { UserKeysDeleteFieldSchema } from '@/lib/db-safe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { verifySecretBeforeSave } from '@/lib/provider-key-verify';
import { buildUserKeysPublicPayload } from '@/lib/user-keys-payload';
import { vaultWriteRateProfile } from '@/lib/vault-write-rate-profile';
import {
  deleteSecretByField,
  fieldToProvider,
  setEncryptedSecret,
} from '@/lib/user-secret-store';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('vaultRead', await rateLimitKey('user-keys-get', userId));
  if (rlDenied) return rlDenied;

  return NextResponse.json(await buildUserKeysPublicPayload(userId));
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const writeProfile = vaultWriteRateProfile(body);
  const rlDenied = await rateLimitExceededResponse(writeProfile, await rateLimitKey('vault-save', userId));
  if (rlDenied) return rlDenied;

  const supabase = getSupabaseAdmin();

  const secretFields = [
    'anthropic_key',
    'openai_key',
    'google_ai_key',
    'deepseek_key',
    'stripe_secret',
    'stripe_pub',
    'tavily_key',
    'notion_token',
  ] as const;

  type Field = (typeof secretFields)[number];
  const pending: { field: Field; val: string; provider: string }[] = [];

  for (const field of secretFields) {
    if (!(field in body) || typeof body[field] !== 'string') continue;
    const provider = fieldToProvider(field);
    if (!provider) continue;
    const val = (body[field] as string).trim();
    if (!val) continue;
    pending.push({ field, val, provider });
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[api/user-keys POST]', {
      userId,
      writeProfile,
      providers: pending.map((p) => p.provider),
    });
  }

  for (const { val, provider } of pending) {
    const check = await verifySecretBeforeSave(provider, val);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.message, provider, hint: 'Key was not saved — fix the error and try again.' },
        { status: 400 },
      );
    }
  }

  for (const { val, provider } of pending) {
    try {
      await setEncryptedSecret(userId, provider, val);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Encrypt failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if ('preferences' in body && body.preferences !== undefined) {
    const { data: existing } = await supabase
      .from('user_api_keys')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    const row = {
      user_id: userId,
      preferences: body.preferences,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { error } = await supabase.from('user_api_keys').update(row).eq('user_id', userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from('user_api_keys').insert(row);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const payload = await buildUserKeysPublicPayload(userId);
  return NextResponse.json({ success: true, ...payload });
}

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('user-keys-del', userId));
  if (rlDenied) return rlDenied;

  const raw = await req.json();
  const parsed = UserKeysDeleteFieldSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const { field } = parsed.data;

  try {
    await deleteSecretByField(userId, field);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
