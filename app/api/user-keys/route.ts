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
import {
  deleteSecretByField,
  fieldToProvider,
  getSecretKeyPreviews,
  getSecretPresence,
  setEncryptedSecret,
} from '@/lib/user-secret-store';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('user-keys-get', userId));
  if (rlDenied) return rlDenied;

  const { has, preferences } = await getSecretPresence(userId);
  const previews = await getSecretKeyPreviews(userId);

  return NextResponse.json({
    preferences,
    has: {
      anthropic: has.anthropic,
      openai: has.openai,
      google_ai: has.google_ai,
      deepseek: has.deepseek,
      stripe: has.stripe,
      stripe_pub: has.stripe_publishable,
      tavily: has.tavily,
      notion: has.notion,
    },
    previews,
    dropbox_oauth_configured: Boolean(
      process.env.DROPBOX_CLIENT_ID?.trim() && process.env.DROPBOX_CLIENT_SECRET?.trim(),
    ),
    anthropic_key: null,
    openai_key: null,
    google_ai_key: null,
    deepseek_key: null,
    stripe_secret: null,
    stripe_pub: null,
    tavily_key: null,
    notion_token: null,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('user-keys-post', userId));
  if (rlDenied) return rlDenied;

  const body = await req.json();
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

  return NextResponse.json({ success: true });
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
