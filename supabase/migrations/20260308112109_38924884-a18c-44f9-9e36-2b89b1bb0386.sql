-- Trusted devices table — stores permanently locked devices per user
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_label text,
  ip_address text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  is_revoked boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own trusted devices
CREATE POLICY "Users can view own trusted devices"
ON public.trusted_devices FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own trusted devices (for first registration)
CREATE POLICY "Users can register own devices"
ON public.trusted_devices FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update last_used_at on their own devices
CREATE POLICY "Users can update own device usage"
ON public.trusted_devices FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage trusted devices"
ON public.trusted_devices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Platform settings table for global config
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY DEFAULT 'default',
  max_devices_per_student integer NOT NULL DEFAULT 1,
  session_timeout_minutes integer NOT NULL DEFAULT 5,
  device_lock_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
ON public.platform_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.platform_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.platform_settings (id, max_devices_per_student, session_timeout_minutes, device_lock_enabled)
VALUES ('default', 1, 5, true)
ON CONFLICT (id) DO NOTHING;