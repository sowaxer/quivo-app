-- Encrypted per-provider API credentials (app decrypts server-side only with ENCRYPTION_KEY).
-- Coexists with legacy public.user_api_keys columns; new writes go to vault and clear legacy columns.

CREATE TABLE IF NOT EXISTS public.user_api_key_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_api_key_vault ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_only_vault" ON public.user_api_key_vault;
CREATE POLICY "service_role_only_vault" ON public.user_api_key_vault
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role'));

CREATE INDEX IF NOT EXISTS idx_user_api_key_vault_user ON public.user_api_key_vault (user_id);
