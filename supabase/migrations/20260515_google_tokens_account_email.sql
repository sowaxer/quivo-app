-- Optional Google account email after OAuth (for Settings UI)
ALTER TABLE public.google_tokens
  ADD COLUMN IF NOT EXISTS account_email TEXT;
