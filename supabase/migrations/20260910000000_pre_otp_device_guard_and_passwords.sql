-- Add has_password column to profiles if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS has_password BOOLEAN NOT NULL DEFAULT false;

-- Create index for fast phone lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- Function to check device trust and password status BEFORE sending OTP or accepting login
CREATE OR REPLACE FUNCTION public.check_student_device(
  p_phone text,
  p_device_fp text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_raw_digits text;
  v_local_phone text;
  v_intl_phone text;
  v_trusted_count int := 0;
  v_is_trusted boolean := false;
  v_active_label text := null;
  v_has_password boolean := false;
  v_max_devices int := 1;
  v_device_lock boolean := true;
BEGIN
  -- Normalize phone numbers
  v_raw_digits := regexp_replace(p_phone, '\D', '', 'g');
  IF v_raw_digits LIKE '880%' THEN
    v_intl_phone := v_raw_digits;
    v_local_phone := '0' || substring(v_raw_digits from 4);
  ELSEIF v_raw_digits LIKE '0%' THEN
    v_local_phone := v_raw_digits;
    v_intl_phone := '880' || substring(v_raw_digits from 2);
  ELSE
    v_local_phone := '0' || v_raw_digits;
    v_intl_phone := '880' || v_raw_digits;
  END IF;

  -- Find student user_id and has_password from profiles
  SELECT user_id, has_password
  INTO v_user_id, v_has_password
  FROM public.profiles
  WHERE phone IN (v_local_phone, v_intl_phone, v_raw_digits)
  ORDER BY updated_at DESC
  LIMIT 1;

  -- If user doesn't exist yet
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_exists', false,
      'device_status', 'allowed',
      'has_password', false
    );
  END IF;

  -- Read platform settings
  SELECT COALESCE(max_devices_per_student, 1), COALESCE(device_lock_enabled, true)
  INTO v_max_devices, v_device_lock
  FROM public.platform_settings
  WHERE id = 'default';

  IF v_max_devices IS NULL THEN v_max_devices := 1; END IF;
  IF v_device_lock IS NULL THEN v_device_lock := true; END IF;

  -- If device locking is disabled globally
  IF NOT v_device_lock THEN
    RETURN jsonb_build_object(
      'user_exists', true,
      'device_status', 'allowed',
      'has_password', COALESCE(v_has_password, false)
    );
  END IF;

  -- Check trusted devices for this user
  SELECT 
    COUNT(*),
    COALESCE(bool_or(device_fingerprint = p_device_fp), false),
    COALESCE((SELECT device_label FROM public.trusted_devices WHERE user_id = v_user_id AND is_revoked = false ORDER BY last_used_at DESC LIMIT 1), 'Primary device')
  INTO v_trusted_count, v_is_trusted, v_active_label
  FROM public.trusted_devices
  WHERE user_id = v_user_id AND is_revoked = false;

  -- If device is already trusted, or user has no registered devices yet
  IF v_is_trusted OR v_trusted_count < v_max_devices THEN
    RETURN jsonb_build_object(
      'user_exists', true,
      'device_status', 'allowed',
      'has_password', COALESCE(v_has_password, false)
    );
  END IF;

  -- Genuinely untrusted device and limit reached -> BLOCK
  RETURN jsonb_build_object(
    'user_exists', true,
    'device_status', 'blocked',
    'has_password', COALESCE(v_has_password, false),
    'active_device', v_active_label,
    'message', 'This account is already registered to another device (' || v_active_label || '). Please use your registered device or contact academy admin to reset.'
  );
END;
$$;

-- Grant execution to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.check_student_device(text, text) TO anon, authenticated, service_role;

-- Helper function to record that a student has set a password
CREATE OR REPLACE FUNCTION public.mark_password_set(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET has_password = true, updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_password_set(uuid) TO authenticated, service_role;
