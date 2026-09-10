-- Enhance check_student_device to also return auth_email so frontend password login can directly target the exact auth email
CREATE OR REPLACE FUNCTION public.check_student_device(
  p_phone text,
  p_device_fp text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
  v_auth_email text := null;
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

  -- If user exists, find their auth email from auth.users
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_auth_email
    FROM auth.users
    WHERE id = v_user_id;
  ELSE
    -- Try checking auth.users directly by deterministic mock email patterns
    SELECT id, email INTO v_user_id, v_auth_email
    FROM auth.users
    WHERE email IN (
      's' || v_raw_digits || '@shahariamath.com',
      's' || v_local_phone || '@shahariamath.com'
    )
    LIMIT 1;
  END IF;

  -- Fallback mock email if none found
  IF v_auth_email IS NULL THEN
    v_auth_email := 's' || v_local_phone || '@shahariamath.com';
  END IF;

  -- If user doesn't exist yet
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'user_exists', false,
      'device_status', 'allowed',
      'has_password', false,
      'auth_email', v_auth_email
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
      'has_password', COALESCE(v_has_password, false),
      'auth_email', v_auth_email
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
      'has_password', COALESCE(v_has_password, false),
      'auth_email', v_auth_email
    );
  END IF;

  -- Genuinely untrusted device and limit reached -> BLOCK
  RETURN jsonb_build_object(
    'user_exists', true,
    'device_status', 'blocked',
    'has_password', COALESCE(v_has_password, false),
    'auth_email', v_auth_email,
    'active_device', v_active_label,
    'message', 'This account is already registered to another device (' || v_active_label || '). Please use your registered device or contact academy admin to reset.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_student_device(text, text) TO anon, authenticated, service_role;
