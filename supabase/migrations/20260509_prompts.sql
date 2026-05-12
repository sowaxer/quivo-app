-- User prompt library
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

CREATE POLICY "service_role_only" ON public.user_prompts
  USING (auth.role() = 'service_role');
