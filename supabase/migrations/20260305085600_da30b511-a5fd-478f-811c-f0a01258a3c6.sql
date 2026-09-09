
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table
CREATE POLICY "No direct access to otp_codes" ON public.otp_codes
  FOR SELECT USING (false);

-- Auto-cleanup old OTPs
CREATE INDEX idx_otp_codes_phone ON public.otp_codes(phone, created_at DESC);
