-- Optional profile fields for Dropbox OAuth UI (Connected badge + email)
ALTER TABLE public.dropbox_tokens
  ADD COLUMN IF NOT EXISTS account_email TEXT,
  ADD COLUMN IF NOT EXISTS account_display_name TEXT;
