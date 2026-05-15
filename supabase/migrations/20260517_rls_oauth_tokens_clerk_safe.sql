-- ═══════════════════════════════════════════════════════════════════════════
-- Re-harden OAuth token tables (google_tokens, dropbox_tokens) with RLS.
--
-- IMPORTANT (Clerk + Supabase):
--   user_id columns are TEXT Clerk IDs (e.g. user_2abc…), NOT Supabase auth.uid().
--   Do NOT use auth.uid() for these tables — it will not match and breaks nothing
--   useful while giving a false sense of security.
--
-- App server uses SUPABASE_SERVICE_ROLE_KEY only for these rows; the service role
-- bypasses RLS. Policies here deny anon / authenticated direct PostgREST access
-- so browser clients cannot read OAuth secrets even if misconfigured.
--
-- public.api_keys already uses JWT sub policies in 20260516_api_keys_and_rls.sql.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dropbox_tokens ENABLE ROW LEVEL SECURITY;

-- google_tokens: drop legacy / permissive policy names
DROP POLICY IF EXISTS "Service role only" ON public.google_tokens;
DROP POLICY IF EXISTS "service_role_only" ON public.google_tokens;
DROP POLICY IF EXISTS "Allow service role full access" ON public.google_tokens;
DROP POLICY IF EXISTS "Allow authenticated users" ON public.google_tokens;
DROP POLICY IF EXISTS "Allow anon insert" ON public.google_tokens;
DROP POLICY IF EXISTS "Users own tokens only" ON public.google_tokens;

CREATE POLICY "google_tokens_service_role_only"
  ON public.google_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- dropbox_tokens
DROP POLICY IF EXISTS "service_role_only" ON public.dropbox_tokens;
DROP POLICY IF EXISTS "Service role only" ON public.dropbox_tokens;

CREATE POLICY "dropbox_tokens_service_role_only"
  ON public.dropbox_tokens
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Audit: RLS status (run manually in SQL editor anytime) ───────────────────
-- SELECT schemaname, tablename, rowsecurity AS rls_enabled
-- FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
--
-- SELECT schemaname, tablename, policyname, roles, cmd
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
