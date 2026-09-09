CREATE TABLE IF NOT EXISTS public.bkash_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  id_token text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_in integer NOT NULL DEFAULT 3600
);

-- Deny all access to this table from authenticated and anon roles,
-- it should only be accessible by the service role from the Edge Function.
ALTER TABLE public.bkash_tokens ENABLE ROW LEVEL SECURITY;
