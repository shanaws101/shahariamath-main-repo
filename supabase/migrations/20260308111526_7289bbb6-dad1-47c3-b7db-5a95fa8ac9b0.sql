-- Session tracking table
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_label text, -- e.g. "Chrome on Windows"
  ip_address text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert/update their own sessions
CREATE POLICY "Users can upsert own sessions"
ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage sessions"
ON public.user_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Session violations / sharing attempts log
CREATE TABLE public.session_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  violation_type text NOT NULL DEFAULT 'blocked_login', -- blocked_login, concurrent_usage
  blocked_device_fingerprint text,
  blocked_device_label text,
  blocked_ip text,
  active_device_fingerprint text,
  active_device_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view violations
CREATE POLICY "Admins can manage violations"
ON public.session_violations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to insert violations (for logging blocked attempts)
CREATE POLICY "Users can log own violations"
ON public.session_violations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Max devices setting in profiles (default 1)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_devices integer NOT NULL DEFAULT 1;