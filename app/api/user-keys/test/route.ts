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
import {
  verifyAnthropicKey,
  verifyDeepSeekKey,
  verifyGoogleAIKey,
  verifyOpenAIKey,
  verifyStripeSecretKey,
} from '@/lib/provider-key-verify';
import { getDecryptedSecret } from '@/lib/user-secret-store';

const PROVIDER_MAP: Record<string, string> = {
  anthropic: 'anthropic',
  openai: 'openai',
  google_ai: 'google_ai',
  deepseek: 'deepseek',
  stripe: 'stripe_secret',
  stripe_secret: 'stripe_secret',
};

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
    case 'anthropic': {
      const v = await verifyAnthropicKey(key);
      result = { success: v.ok, message: v.message };
      break;
    }
    case 'openai': {
      const v = await verifyOpenAIKey(key);
      result = { success: v.ok, message: v.message };
      break;
    }
    case 'google_ai': {
      const v = await verifyGoogleAIKey(key);
      result = { success: v.ok, message: v.message };
      break;
    }
    case 'deepseek': {
      const v = await verifyDeepSeekKey(key);
      result = { success: v.ok, message: v.message };
      break;
    }
    case 'stripe':
    case 'stripe_secret': {
      const v = await verifyStripeSecretKey(key);
      result = { success: v.ok, message: v.message };
      break;
    }
    default:
      result = { success: false, message: 'Unknown provider' };
  }

  return NextResponse.json(result);
}
