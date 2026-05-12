-- ╔══════════════════════════════════════════════════════════════════════╗
-- ║  FINEDGE — Complete Supabase Setup                                  ║
-- ║  Run this once in your Supabase SQL Editor to set up all tables.    ║
-- ╚══════════════════════════════════════════════════════════════════════╝

-- ── 1. User API Keys ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  user_id        TEXT        PRIMARY KEY,
  anthropic_key  TEXT,
  openai_key     TEXT,
  google_ai_key  TEXT,
  stripe_secret  TEXT,
  stripe_pub     TEXT,
  tavily_key     TEXT,
  notion_token   TEXT,
  preferences    JSONB       DEFAULT '{}',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.user_api_keys;
CREATE POLICY "service_role_only" ON public.user_api_keys
  USING (auth.role() = 'service_role');

-- ── 2. Google OAuth Tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.google_tokens (
  user_id       TEXT        PRIMARY KEY,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  expiry_date   BIGINT,
  scope         TEXT,
  token_type    TEXT        DEFAULT 'Bearer',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.google_tokens;
CREATE POLICY "service_role_only" ON public.google_tokens
  USING (auth.role() = 'service_role');

-- ── 3. Notes & Reminders ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  content    TEXT        DEFAULT '',
  status     TEXT        DEFAULT 'pending',
  tags       TEXT[]      DEFAULT '{}',
  due_date   DATE,
  priority   TEXT        DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notes_user_idx ON public.notes (user_id);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.notes;
CREATE POLICY "service_role_only" ON public.notes
  USING (auth.role() = 'service_role');

-- ── 4. Prompt Library ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_prompts (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  title      TEXT        NOT NULL,
  content    TEXT        NOT NULL,
  category   TEXT        DEFAULT 'Custom',
  icon       TEXT        DEFAULT '💬',
  tags       TEXT[]      DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_prompts_user_idx ON public.user_prompts (user_id);
ALTER TABLE public.user_prompts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.user_prompts;
CREATE POLICY "service_role_only" ON public.user_prompts
  USING (auth.role() = 'service_role');

-- ── 5. Dropbox OAuth Tokens ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dropbox_tokens (
  user_id       TEXT        PRIMARY KEY,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT,
  account_id    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.dropbox_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_only" ON public.dropbox_tokens;
CREATE POLICY "service_role_only" ON public.dropbox_tokens
  USING (auth.role() = 'service_role');

-- ── Done ──────────────────────────────────────────────────────────────────────
-- All tables created with Row Level Security enabled.
-- The service_role key in your .env.local has full access.
-- Your Clerk user_id is stored as TEXT in user_id columns.
