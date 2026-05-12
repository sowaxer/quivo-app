import { encrypt, decrypt, isEncryptedPayload } from '@/lib/encryption';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** Normalized vault table (one row per user + provider) */
export const USER_API_KEY_VAULT = 'user_api_key_vault';

const FIELD_TO_PROVIDER: Record<string, string> = {
  anthropic_key: 'anthropic',
  openai_key: 'openai',
  google_ai_key: 'google_ai',
  stripe_secret: 'stripe_secret',
  stripe_pub: 'stripe_publishable',
  tavily_key: 'tavily',
  notion_token: 'notion',
};

const PROVIDER_TO_FIELD: Record<string, string> = Object.fromEntries(
  Object.entries(FIELD_TO_PROVIDER).map(([k, v]) => [v, k]),
);

export function fieldToProvider(field: string): string | null {
  return FIELD_TO_PROVIDER[field] ?? null;
}

function legacyColumn(provider: string): string | null {
  return PROVIDER_TO_FIELD[provider] ?? null;
}

/** Decrypt secret for server-side use only. Never send to client. */
export async function getDecryptedSecret(
  userId: string,
  provider: string,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const { data: vault } = await supabase
    .from(USER_API_KEY_VAULT)
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (vault?.encrypted_key) {
    try {
      return decrypt(vault.encrypted_key as string);
    } catch {
      return null;
    }
  }

  const col = legacyColumn(provider);
  if (!col) return null;

  const { data: row } = await supabase
    .from('user_api_keys')
    .select(col)
    .eq('user_id', userId)
    .maybeSingle();

  const raw = (row as Record<string, string | null> | null)?.[col];
  if (!raw) return null;
  if (isEncryptedPayload(raw)) {
    try {
      return decrypt(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export async function setEncryptedSecret(
  userId: string,
  provider: string,
  plaintext: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const encrypted_key = encrypt(plaintext);

  const { error: vErr } = await supabase.from(USER_API_KEY_VAULT).upsert(
    {
      user_id: userId,
      provider,
      encrypted_key,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' },
  );
  if (vErr) throw vErr;

  const col = legacyColumn(provider);
  if (col) {
    await supabase.from('user_api_keys').update({ [col]: null }).eq('user_id', userId);
  }
}

export async function deleteSecretByProvider(
  userId: string,
  provider: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from(USER_API_KEY_VAULT).delete().eq('user_id', userId).eq('provider', provider);

  const col = legacyColumn(provider);
  if (col) {
    await supabase.from('user_api_keys').update({ [col]: null }).eq('user_id', userId);
  }
}

export async function deleteSecretByField(userId: string, field: string): Promise<void> {
  const provider = fieldToProvider(field);
  if (!provider) throw new Error('Invalid field');
  await deleteSecretByProvider(userId, provider);
}

export type SecretPresence = {
  has: {
    anthropic: boolean;
    openai: boolean;
    google_ai: boolean;
    stripe: boolean;
    stripe_publishable: boolean;
    tavily: boolean;
    notion: boolean;
  };
  preferences: Record<string, unknown>;
};

export async function getSecretPresence(userId: string): Promise<SecretPresence> {
  const supabase = getSupabaseAdmin();
  const has = {
    anthropic: false,
    openai: false,
    google_ai: false,
    stripe: false,
    stripe_publishable: false,
    tavily: false,
    notion: false,
  };

  const { data: vaultRows } = await supabase
    .from(USER_API_KEY_VAULT)
    .select('provider')
    .eq('user_id', userId);

  for (const r of vaultRows ?? []) {
    const p = r.provider as string;
    if (p === 'anthropic') has.anthropic = true;
    if (p === 'openai') has.openai = true;
    if (p === 'google_ai') has.google_ai = true;
    if (p === 'stripe_secret') has.stripe = true;
    if (p === 'stripe_publishable') has.stripe_publishable = true;
    if (p === 'tavily') has.tavily = true;
    if (p === 'notion') has.notion = true;
  }

  const { data: leg } = await supabase
    .from('user_api_keys')
    .select(
      'anthropic_key, openai_key, google_ai_key, stripe_secret, stripe_pub, tavily_key, notion_token, preferences',
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (leg) {
    if (leg.anthropic_key) has.anthropic = true;
    if (leg.openai_key) has.openai = true;
    if (leg.google_ai_key) has.google_ai = true;
    if (leg.stripe_secret) has.stripe = true;
    if (leg.stripe_pub) has.stripe_publishable = true;
    if (leg.tavily_key) has.tavily = true;
    if (leg.notion_token) has.notion = true;
  }

  return {
    has,
    preferences: (leg?.preferences as Record<string, unknown>) ?? {},
  };
}
