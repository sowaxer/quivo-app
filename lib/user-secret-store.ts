import { encrypt, decrypt, isEncryptedPayload } from '@/lib/encryption';
import { buildKeyHint } from '@/lib/key-hint';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

/** Normalized vault table (one row per user + provider) */
export const USER_API_KEY_VAULT = 'user_api_key_vault';

/** Canonical keys table (mirrors vault ciphertext; hints + last_used without decrypt). */
export const USER_API_KEYS_TABLE = 'api_keys';

const FIELD_TO_PROVIDER: Record<string, string> = {
  anthropic_key: 'anthropic',
  openai_key: 'openai',
  google_ai_key: 'google_ai',
  deepseek_key: 'deepseek',
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
  opts?: { touchUsed?: boolean },
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
      const plain = decrypt(vault.encrypted_key as string);
      if (plain && opts?.touchUsed) void touchSecretLastUsed(userId, provider);
      return plain;
    } catch {
      return null;
    }
  }

  const { data: apiRow } = await supabase
    .from(USER_API_KEYS_TABLE)
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (apiRow?.encrypted_key) {
    try {
      const plain = decrypt(apiRow.encrypted_key as string);
      if (plain && opts?.touchUsed) void touchSecretLastUsed(userId, provider);
      return plain;
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
      const plain = decrypt(raw);
      if (plain && opts?.touchUsed) void touchSecretLastUsed(userId, provider);
      return plain;
    } catch {
      return null;
    }
  }
  if (opts?.touchUsed) void touchSecretLastUsed(userId, provider);
  return raw;
}

export async function setEncryptedSecret(
  userId: string,
  provider: string,
  plaintext: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const encrypted_key = encrypt(plaintext);
  const key_hint = buildKeyHint(plaintext);
  const now = new Date().toISOString();

  const { error: vErr } = await supabase.from(USER_API_KEY_VAULT).upsert(
    {
      user_id: userId,
      provider,
      encrypted_key,
      updated_at: now,
    },
    { onConflict: 'user_id,provider' },
  );
  if (vErr) throw vErr;

  const { error: aErr } = await supabase.from(USER_API_KEYS_TABLE).upsert(
    {
      user_id: userId,
      provider,
      encrypted_key,
      key_hint,
      updated_at: now,
    },
    { onConflict: 'user_id,provider' },
  );
  if (aErr) throw aErr;

  const col = legacyColumn(provider);
  if (col) {
    await supabase.from('user_api_keys').update({ [col]: null }).eq('user_id', userId);
  }
}

/** Mark a stored key as used (api_keys.last_used_at). Fire-and-forget safe. */
export async function touchSecretLastUsed(userId: string, provider: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const ts = new Date().toISOString();
  const { error } = await supabase
    .from(USER_API_KEYS_TABLE)
    .update({ last_used_at: ts, updated_at: ts })
    .eq('user_id', userId)
    .eq('provider', provider);
  if (error) {
    /* avoid logging secrets; table may not exist until migration */
  }
}

export async function deleteSecretByProvider(
  userId: string,
  provider: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from(USER_API_KEY_VAULT).delete().eq('user_id', userId).eq('provider', provider);
  await supabase.from(USER_API_KEYS_TABLE).delete().eq('user_id', userId).eq('provider', provider);

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
    deepseek: boolean;
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
    deepseek: false,
    stripe: false,
    stripe_publishable: false,
    tavily: false,
    notion: false,
  };

  const [{ data: vaultRows }, { data: apiRows }] = await Promise.all([
    supabase.from(USER_API_KEY_VAULT).select('provider').eq('user_id', userId),
    supabase.from(USER_API_KEYS_TABLE).select('provider').eq('user_id', userId),
  ]);

  for (const r of vaultRows ?? []) {
    const p = r.provider as string;
    if (p === 'anthropic') has.anthropic = true;
    if (p === 'openai') has.openai = true;
    if (p === 'google_ai') has.google_ai = true;
    if (p === 'deepseek') has.deepseek = true;
    if (p === 'stripe_secret') has.stripe = true;
    if (p === 'stripe_publishable') has.stripe_publishable = true;
    if (p === 'tavily') has.tavily = true;
    if (p === 'notion') has.notion = true;
  }

  for (const r of apiRows ?? []) {
    const p = r.provider as string;
    if (p === 'anthropic') has.anthropic = true;
    if (p === 'openai') has.openai = true;
    if (p === 'google_ai') has.google_ai = true;
    if (p === 'deepseek') has.deepseek = true;
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

/** Last 4 chars preview per UI id (server-only; never sends full secrets). */
export async function getSecretKeyPreviews(userId: string): Promise<Record<string, string>> {
  const previews: Record<string, string> = {};
  const supabase = getSupabaseAdmin();
  const idByProvider: Record<string, string> = {
    anthropic: 'anthropic',
    openai: 'openai',
    google_ai: 'google_ai',
    deepseek: 'deepseek',
    stripe_secret: 'stripe_secret',
    stripe_publishable: 'stripe_pub',
    tavily: 'tavily',
    notion: 'notion',
  };

  const { data: hintRows } = await supabase
    .from(USER_API_KEYS_TABLE)
    .select('provider, key_hint')
    .eq('user_id', userId);

  for (const row of hintRows ?? []) {
    const p = row.provider as string;
    const hint = row.key_hint as string | null;
    const id = idByProvider[p];
    if (id && hint) previews[id] = hint;
  }

  const rows: { provider: string; id: string }[] = [
    { provider: 'anthropic', id: 'anthropic' },
    { provider: 'openai', id: 'openai' },
    { provider: 'google_ai', id: 'google_ai' },
    { provider: 'deepseek', id: 'deepseek' },
    { provider: 'stripe_secret', id: 'stripe_secret' },
    { provider: 'stripe_publishable', id: 'stripe_pub' },
    { provider: 'tavily', id: 'tavily' },
    { provider: 'notion', id: 'notion' },
  ];
  for (const { provider, id } of rows) {
    if (previews[id]) continue;
    try {
      const s = await getDecryptedSecret(userId, provider);
      if (s && s.length >= 4) previews[id] = buildKeyHint(s);
    } catch {
      /* skip */
    }
  }
  return previews;
}
