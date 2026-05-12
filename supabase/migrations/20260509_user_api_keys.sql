-- User API keys table
-- Keys are stored server-side and NEVER exposed to the browser unmasked
CREATE TABLE IF NOT EXISTS public.user_api_keys (
  user_id        TEXT        PRIMARY KEY,
  anthropic_key  TEXT,
  openai_key     TEXT,
  google_ai_key  TEXT,
  stripe_secret  TEXT,
  stripe_pub     TEXT,
  tavily_key     TEXT,
  notion_token   TEXT,
  preferences    JSONB       DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.user_api_keys
  USING (auth.role() = 'service_role');

-- User preferences table (general settings, appearance, etc.)
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id              TEXT        PRIMARY KEY,
  default_model        TEXT        DEFAULT 'claude-sonnet-4-5',
  stream_responses     BOOLEAN     DEFAULT true,
  sound_notifications  BOOLEAN     DEFAULT true,
  enter_to_send        BOOLEAN     DEFAULT true,
  language             TEXT        DEFAULT 'en',
  timezone             TEXT        DEFAULT 'auto',
  email_notifications  BOOLEAN     DEFAULT false,
  desktop_notifications BOOLEAN    DEFAULT false,
  appearance_theme     TEXT        DEFAULT 'dark',
  font_size            TEXT        DEFAULT 'medium',
  chat_width           TEXT        DEFAULT 'standard',
  enabled_models       JSONB       DEFAULT '["claude-sonnet-4-5","gemini-1.5-pro","gpt-4o"]'::jsonb,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.user_preferences
  USING (auth.role() = 'service_role');
