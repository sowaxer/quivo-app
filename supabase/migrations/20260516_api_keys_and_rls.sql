-- ═══════════════════════════════════════════════════════════════════════════
-- Canonical per-user API keys (AES ciphertext in app) + audit + RLS
-- Next.js API routes use SUPABASE_SERVICE_ROLE_KEY (bypasses RLS).
-- Authenticated policies: Clerk user id in JWT `sub`, OR Postgres session:
--   SET LOCAL app.user_id = '<clerk_user_id>';
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  encrypted_key TEXT NOT NULL,
  key_hint TEXT,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys (user_id);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_keys_owner_select" ON public.api_keys;
CREATE POLICY "api_keys_owner_select" ON public.api_keys
  FOR SELECT
  TO authenticated
  USING (
    (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND user_id = (auth.jwt() ->> 'sub')
    )
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND user_id = NULLIF(current_setting('app.user_id', true), '')
    )
  );

DROP POLICY IF EXISTS "api_keys_owner_insert" ON public.api_keys;
CREATE POLICY "api_keys_owner_insert" ON public.api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND user_id = (auth.jwt() ->> 'sub')
    )
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND user_id = NULLIF(current_setting('app.user_id', true), '')
    )
  );

DROP POLICY IF EXISTS "api_keys_owner_update" ON public.api_keys;
CREATE POLICY "api_keys_owner_update" ON public.api_keys
  FOR UPDATE
  TO authenticated
  USING (
    (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND user_id = (auth.jwt() ->> 'sub')
    )
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND user_id = NULLIF(current_setting('app.user_id', true), '')
    )
  )
  WITH CHECK (
    (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND user_id = (auth.jwt() ->> 'sub')
    )
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND user_id = NULLIF(current_setting('app.user_id', true), '')
    )
  );

DROP POLICY IF EXISTS "api_keys_owner_delete" ON public.api_keys;
CREATE POLICY "api_keys_owner_delete" ON public.api_keys
  FOR DELETE
  TO authenticated
  USING (
    (
      (auth.jwt() ->> 'sub') IS NOT NULL
      AND user_id = (auth.jwt() ->> 'sub')
    )
    OR (
      NULLIF(current_setting('app.user_id', true), '') IS NOT NULL
      AND user_id = NULLIF(current_setting('app.user_id', true), '')
    )
  );

-- google_tokens / dropbox_tokens: remain service_role–only in app code.
-- Do not grant SELECT on OAuth secrets to the browser Supabase client.
