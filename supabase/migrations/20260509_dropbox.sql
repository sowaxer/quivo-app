-- Dropbox OAuth tokens
CREATE TABLE IF NOT EXISTS public.dropbox_tokens (
  user_id      TEXT        PRIMARY KEY,
  access_token TEXT        NOT NULL,
  refresh_token TEXT,
  account_id   TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dropbox_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.dropbox_tokens USING (auth.role() = 'service_role');
