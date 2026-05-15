/**
 * Keep Agent modal keys (localStorage) in sync with Settings vault (encrypted per user).
 * Quivo never uses platform ANTHROPIC/STRIPE keys for end-user features.
 */

import { loadApiKeys, saveApiKeys, type ApiKeys } from '@/hooks/useAgent';

const VAULT_FIELD_TO_AGENT: Record<string, keyof ApiKeys> = {
  anthropic_key: 'anthropic',
  stripe_secret: 'stripe',
};

/** After saving in Settings, mirror into Agent localStorage so /agent works without re-pasting. */
export function mirrorVaultFieldToAgentStorage(field: string, plainValue: string): void {
  const agentField = VAULT_FIELD_TO_AGENT[field];
  if (!agentField || !plainValue.trim()) return;
  const current = loadApiKeys();
  saveApiKeys({ ...current, [agentField]: plainValue.trim() });
}

/** After saving in Agent modal, persist to user vault (Chat, bank statements, etc.). */
export async function syncAgentKeysToVault(keys: ApiKeys): Promise<{ ok: boolean; error?: string }> {
  const body: Record<string, string> = {};
  if (keys.anthropic?.trim()) body.anthropic_key = keys.anthropic.trim();
  if (keys.stripe?.trim()) body.stripe_secret = keys.stripe.trim();

  if (Object.keys(body).length === 0) {
    return { ok: true };
  }

  try {
    const res = await fetch('/api/user-keys', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
