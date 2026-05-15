/**
 * Minimal live checks before persisting API keys (used by POST /api/user-keys).
 */

export type VerifyResult = { ok: true; message: string } | { ok: false; message: string };

export async function verifyAnthropicKey(key: string): Promise<VerifyResult> {
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
        max_tokens: 8,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    if (res.ok) return { ok: true, message: 'Anthropic API key accepted' };
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: msg };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function verifyOpenAIKey(key: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/models?limit=1', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) return { ok: true, message: 'OpenAI API key accepted' };
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: msg };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function verifyGoogleAIKey(key: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': key },
    });
    if (res.ok) return { ok: true, message: 'Gemini API key accepted' };
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: msg };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function verifyStripeSecretKey(key: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { business_profile?: { name?: string }; email?: string };
      const label = data.business_profile?.name || data.email || 'Stripe account';
      return { ok: true, message: `Connected · ${label}` };
    }
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: msg };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export function verifyStripePublishableKey(key: string): VerifyResult {
  if (/^pk_(live|test)_[a-zA-Z0-9]+$/.test(key.trim())) {
    return { ok: true, message: 'Publishable key format OK' };
  }
  return { ok: false, message: 'Expected pk_live_… or pk_test_…' };
}

export async function verifyDeepSeekKey(key: string): Promise<VerifyResult> {
  try {
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        max_tokens: 4,
        messages: [{ role: 'user', content: 'hi' }],
        stream: false,
      }),
    });
    if (res.ok) return { ok: true, message: 'DeepSeek API key accepted' };
    const err = await res.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message ?? `HTTP ${res.status}`;
    return { ok: false, message: msg };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

/** Map vault / field provider id → verifier */
export async function verifySecretBeforeSave(
  provider: string,
  plaintext: string,
): Promise<VerifyResult> {
  const v = plaintext.trim();
  switch (provider) {
    case 'anthropic':
      if (!/^sk-ant-api/.test(v)) return { ok: false, message: 'Anthropic keys should start with sk-ant-api…' };
      return verifyAnthropicKey(v);
    case 'openai':
      if (!/^sk-/.test(v)) return { ok: false, message: 'OpenAI keys should start with sk-…' };
      return verifyOpenAIKey(v);
    case 'google_ai':
      if (!/^AIza/.test(v)) return { ok: false, message: 'Gemini keys should start with AIza…' };
      return verifyGoogleAIKey(v);
    case 'stripe_secret':
      if (!/^sk_(live|test|rk)_/.test(v)) return { ok: false, message: 'Use sk_live_, sk_test_, or rk_ (restricted) Stripe secret key' };
      return verifyStripeSecretKey(v);
    case 'stripe_publishable':
      return verifyStripePublishableKey(v);
    case 'deepseek':
      if (!/^sk-/.test(v)) return { ok: false, message: 'DeepSeek keys should start with sk-…' };
      return verifyDeepSeekKey(v);
    case 'tavily':
    case 'notion':
      return { ok: true, message: 'Stored (not verified live)' };
    default:
      return { ok: true, message: 'OK' };
  }
}
