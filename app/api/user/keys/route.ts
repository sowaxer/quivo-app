/**
 * GET  /api/user/keys — list providers with hasKey only (no secret material)
 * POST /api/user/keys — body: { provider, key } OR legacy { anthropic_key, ... }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { vaultWriteRateProfile, vaultWriteRateProfileFromProvider } from '@/lib/vault-write-rate-profile';
import {
  fieldToProvider,
  getSecretPresence,
  setEncryptedSecret,
} from '@/lib/user-secret-store';
import { verifySecretBeforeSave } from '@/lib/provider-key-verify';

const ALLOWED_PROVIDERS = new Set([
  'anthropic',
  'openai',
  'google_ai',
  'deepseek',
  'stripe_secret',
  'stripe_publishable',
  'tavily',
  'notion',
]);

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('vaultRead', await rateLimitKey('user-keys-v2-get', userId));
  if (rlDenied) return rlDenied;

  const { has, preferences } = await getSecretPresence(userId);

  const providers = [
    { provider: 'anthropic', hasKey: has.anthropic },
    { provider: 'openai', hasKey: has.openai },
    { provider: 'google_ai', hasKey: has.google_ai },
    { provider: 'deepseek', hasKey: has.deepseek },
    { provider: 'stripe_secret', hasKey: has.stripe },
    { provider: 'stripe_publishable', hasKey: has.stripe_publishable },
    { provider: 'tavily', hasKey: has.tavily },
    { provider: 'notion', hasKey: has.notion },
  ];

  return NextResponse.json({ providers, preferences });
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

  if (body.provider && typeof body.key === 'string') {
    const p = body.provider as string;
    if (!ALLOWED_PROVIDERS.has(p)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
    const writeProfile = vaultWriteRateProfileFromProvider(p);
    const rlDenied = await rateLimitExceededResponse(writeProfile, await rateLimitKey('vault-save', userId));
    if (rlDenied) return rlDenied;

    const val = (body.key as string).trim();
    const check = await verifySecretBeforeSave(p, val);
    if (!check.ok) {
      return NextResponse.json({ error: check.message }, { status: 400 });
    }
    try {
      await setEncryptedSecret(userId, p, val);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Encrypt failed';
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[api/user/keys POST]', { userId, mode: 'provider', provider: p, writeProfile });
    }
    const { has, preferences } = await getSecretPresence(userId);
    const providers = [
      { provider: 'anthropic', hasKey: has.anthropic },
      { provider: 'openai', hasKey: has.openai },
      { provider: 'google_ai', hasKey: has.google_ai },
      { provider: 'deepseek', hasKey: has.deepseek },
      { provider: 'stripe_secret', hasKey: has.stripe },
      { provider: 'stripe_publishable', hasKey: has.stripe_publishable },
      { provider: 'tavily', hasKey: has.tavily },
      { provider: 'notion', hasKey: has.notion },
    ];
    return NextResponse.json({ success: true, providers, preferences });
  }

  const writeProfile = vaultWriteRateProfile(body);
  const rlDenied = await rateLimitExceededResponse(writeProfile, await rateLimitKey('vault-save', userId));
  if (rlDenied) return rlDenied;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[api/user/keys POST]', { userId, mode: 'legacy', writeProfile });
  }

  const allowedFields = [
    'anthropic_key',
    'openai_key',
    'google_ai_key',
    'deepseek_key',
    'stripe_secret',
    'stripe_pub',
    'tavily_key',
    'notion_token',
    'preferences',
  ] as const;

  const supabase = getSupabaseAdmin();

  for (const field of allowedFields) {
    if (field === 'preferences') continue;
    if (!(field in body) || typeof body[field] !== 'string') continue;
    const provider = fieldToProvider(field);
    if (!provider) continue;
    const val = (body[field] as string).trim();
    if (!val) continue;
    const check = await verifySecretBeforeSave(provider, val);
    if (!check.ok) {
      return NextResponse.json({ error: check.message, field }, { status: 400 });
    }
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

  const { has, preferences } = await getSecretPresence(userId);
  const providers = [
    { provider: 'anthropic', hasKey: has.anthropic },
    { provider: 'openai', hasKey: has.openai },
    { provider: 'google_ai', hasKey: has.google_ai },
    { provider: 'deepseek', hasKey: has.deepseek },
    { provider: 'stripe_secret', hasKey: has.stripe },
    { provider: 'stripe_publishable', hasKey: has.stripe_publishable },
    { provider: 'tavily', hasKey: has.tavily },
    { provider: 'notion', hasKey: has.notion },
  ];
  return NextResponse.json({ success: true, providers, preferences });
}
