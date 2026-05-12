-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/<your-project>/sql/new

CREATE TABLE IF NOT EXISTS public.google_tokens (
  user_id       TEXT PRIMARY KEY,          -- Clerk userId
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  expiry_date   BIGINT,                    -- Unix timestamp in ms
  token_type    TEXT,
  scope         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Only the service role can read/write tokens (never exposed to the client)
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only"
  ON public.google_tokens
  USING (auth.role() = 'service_role');
