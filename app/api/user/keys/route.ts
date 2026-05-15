/**
 * GET  /api/user/keys — list providers with hasKey only (no secret material)
 * POST /api/user/keys — body: { provider, key } OR legacy { anthropic_key, ... }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
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

  const rlDenied = await rateLimitExceededResponse('default', await rateLimitKey('user-keys-v2-get', userId));
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

  const rlDenied = await rateLimitExceededResponse('keysHourly', await rateLimitKey('vault-save', userId));
  if (rlDenied) return rlDenied;

  const body = await req.json();

  if (body.provider && typeof body.key === 'string') {
    const p = body.provider as string;
    if (!ALLOWED_PROVIDERS.has(p)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }
    const val = body.key.trim();
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
    return NextResponse.json({ success: true });
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

  return NextResponse.json({ success: true });
}
