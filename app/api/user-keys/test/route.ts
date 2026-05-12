/**
 * POST /api/user-keys/test
 * Body: { provider: 'anthropic' | 'openai' | 'google_ai' | 'stripe' }
 *
 * Tests the stored API key by making a minimal real request to the provider.
 * Returns { success: boolean, message: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { rateLimitExceededResponse, rateLimitKey } from '@/lib/api-rate-limit';
import { getDecryptedSecret } from '@/lib/user-secret-store';

const PROVIDER_MAP: Record<string, string> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google_ai: 'google_ai',
  stripe: 'stripe_secret',
};

async function testAnthropic(key: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    if (res.ok) return { success: true, message: 'Claude connected' };
    const err = await res.json().catch(() => ({}));
    return { success: false, message: (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

async function testOpenAI(key: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { success: true, message: 'OpenAI connected' };
    const err = await res.json().catch(() => ({}));
    return { success: false, message: (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

async function testGoogleAI(key: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': key },
    });
    if (res.ok) return { success: true, message: 'Gemini connected' };
    const err = await res.json().catch(() => ({}));
    return { success: false, message: (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

async function testStripe(key: string): Promise<{ success: boolean; message: string; mode?: string }> {
  try {
    const res = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = await res.json();
      const mode = key.startsWith('sk_live') ? 'Live' : 'Test';
      return { success: true, message: `Stripe ${mode} connected · ${(data as { email?: string }).email ?? ''}`, mode };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, message: (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}` };
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rlDenied = await rateLimitExceededResponse('ai', await rateLimitKey('user-keys-test', userId));
  if (rlDenied) return rlDenied;

  const { provider } = await req.json();

  const vaultProvider = PROVIDER_MAP[provider as string];
  if (!vaultProvider) return NextResponse.json({ success: false, message: 'Unknown provider' });

  const key = await getDecryptedSecret(userId, vaultProvider);
  if (!key) return NextResponse.json({ success: false, message: 'No key saved' });

  let result: { success: boolean; message: string };
  switch (provider) {
    case 'anthropic':
      result = await testAnthropic(key);
      break;
    case 'openai':
      result = await testOpenAI(key);
      break;
    case 'google_ai':
      result = await testGoogleAI(key);
      break;
    case 'stripe':
      result = await testStripe(key);
      break;
    default:
      result = { success: false, message: 'Unknown provider' };
  }

  return NextResponse.json(result);
}
