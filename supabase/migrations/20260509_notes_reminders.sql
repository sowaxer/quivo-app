-- Notes table (smart notes with AI)
CREATE TABLE IF NOT EXISTS public.notes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'pending',  -- pending | done
  priority     TEXT        DEFAULT 'normal',             -- low | normal | high
  reminder_at  TIMESTAMPTZ,                              -- optional reminder timestamp
  reminded     BOOLEAN     DEFAULT false,
  tags         TEXT[]      DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON public.notes (user_id);
CREATE INDEX IF NOT EXISTS notes_reminder_idx ON public.notes (reminder_at) WHERE reminded = false AND reminder_at IS NOT NULL;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.notes
  USING (auth.role() = 'service_role');

-- Chat history table
CREATE TABLE IF NOT EXISTS public.chat_history (
  user_id      TEXT        PRIMARY KEY,
  messages     JSONB       DEFAULT '[]'::jsonb,
  model        TEXT        DEFAULT 'claude-sonnet-4-5',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON public.chat_history
  USING (auth.role() = 'service_role');
