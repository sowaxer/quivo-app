-- Security / abuse audit trail (written by service role from app only)
CREATE TABLE IF NOT EXISTS public.security_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  event_type  text NOT NULL,
  ip          text,
  path        text,
  detail      text
);

CREATE INDEX IF NOT EXISTS security_logs_created_at_idx ON public.security_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS security_logs_event_type_idx ON public.security_logs (event_type);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.security_logs IS 'Server-side security events; no anon access. Use service role from API routes.';
