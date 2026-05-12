-- Let JWT-authenticated clients (e.g. Clerk token via Supabase custom JWT) access only their rows.
-- Service role continues to bypass RLS for server-side reads/writes.

DROP POLICY IF EXISTS "user_api_keys_owner_select" ON public.user_api_keys;
CREATE POLICY "user_api_keys_owner_select" ON public.user_api_keys
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_keys_owner_insert" ON public.user_api_keys;
CREATE POLICY "user_api_keys_owner_insert" ON public.user_api_keys
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_keys_owner_update" ON public.user_api_keys;
CREATE POLICY "user_api_keys_owner_update" ON public.user_api_keys
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_keys_owner_delete" ON public.user_api_keys;
CREATE POLICY "user_api_keys_owner_delete" ON public.user_api_keys
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_key_vault_owner_select" ON public.user_api_key_vault;
CREATE POLICY "user_api_key_vault_owner_select" ON public.user_api_key_vault
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_key_vault_owner_insert" ON public.user_api_key_vault;
CREATE POLICY "user_api_key_vault_owner_insert" ON public.user_api_key_vault
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_key_vault_owner_update" ON public.user_api_key_vault;
CREATE POLICY "user_api_key_vault_owner_update" ON public.user_api_key_vault
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );

DROP POLICY IF EXISTS "user_api_key_vault_owner_delete" ON public.user_api_key_vault;
CREATE POLICY "user_api_key_vault_owner_delete" ON public.user_api_key_vault
  FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() ->> 'sub') IS NOT NULL
    AND user_id = (auth.jwt() ->> 'sub')
  );
