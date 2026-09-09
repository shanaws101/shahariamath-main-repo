CREATE OR REPLACE FUNCTION public.create_student_referral_code(_user_id uuid)
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing RECORD;
  _new_slug TEXT;
  _new_code TEXT;
  _new_id UUID;
  _attempt INT := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  SELECT dc.id, dc.short_code, dc.code INTO _existing
  FROM public.discount_codes dc
  WHERE dc.owner_user_id = _user_id
    AND dc.is_referral = true
    AND dc.is_active = true
  ORDER BY dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;

  IF FOUND AND COALESCE(trim(_existing.short_code), '') <> '' THEN
    code_id := _existing.id;
    slug := _existing.short_code;
    code := _existing.code;
    RETURN NEXT;
    RETURN;
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text || _user_id::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug);
    IF _attempt >= 20 THEN
      RAISE EXCEPTION 'Could not generate unique referral slug';
    END IF;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  IF FOUND THEN
    UPDATE public.discount_codes
    SET short_code = _new_slug,
        code = _new_code,
        owner_type = 'student',
        is_referral = true,
        is_active = true,
        discount_type = 'fixed',
        discount_value = 100,
        discount_percent_owner = 0,
        discount_percent_receiver = 0,
        updated_at = now()
    WHERE id = _existing.id
    RETURNING id INTO _new_id;
  ELSE
    INSERT INTO public.discount_codes (
      code, short_code, owner_user_id, owner_type, is_referral,
      is_active, discount_type, discount_value,
      discount_percent_owner, discount_percent_receiver
    ) VALUES (
      _new_code, _new_slug, _user_id, 'student', true,
      true, 'fixed', 100, 0, 0
    ) RETURNING id INTO _new_id;
  END IF;

  code_id := _new_id;
  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_slug()
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT c.code_id, c.slug, c.code
  FROM public.create_student_referral_code(auth.uid()) c;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_referral_slug()
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _new_slug TEXT;
  _new_code TEXT;
  _attempt INT := 0;
  _existing_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text || _uid::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug);
    IF _attempt >= 20 THEN
      RAISE EXCEPTION 'Could not generate unique referral slug';
    END IF;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  SELECT dc.id INTO _existing_id
  FROM public.discount_codes dc
  WHERE dc.owner_user_id = _uid AND dc.is_referral = true AND dc.is_active = true
  ORDER BY dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.discount_codes
    SET short_code = _new_slug,
        code = _new_code,
        owner_type = 'student',
        is_referral = true,
        is_active = true,
        discount_type = 'fixed',
        discount_value = 100,
        updated_at = now()
    WHERE id = _existing_id;
    code_id := _existing_id;
  ELSE
    INSERT INTO public.discount_codes (
      code, short_code, owner_user_id, owner_type, is_referral,
      is_active, discount_type, discount_value,
      discount_percent_owner, discount_percent_receiver
    ) VALUES (
      _new_code, _new_slug, _uid, 'student', true,
      true, 'fixed', 100, 0, 0
    ) RETURNING id INTO _existing_id;
    code_id := _existing_id;
  END IF;

  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_student_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    PERFORM 1 FROM public.create_student_referral_code(NEW.user_id);
  ELSIF TG_TABLE_NAME = 'user_roles' AND NEW.role = 'student' THEN
    PERFORM 1 FROM public.create_student_referral_code(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ensure_profile_referral_code ON public.profiles;
CREATE TRIGGER ensure_profile_referral_code
AFTER INSERT OR UPDATE OF user_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_student_referral_code();

DROP TRIGGER IF EXISTS ensure_role_referral_code ON public.user_roles;
CREATE TRIGGER ensure_role_referral_code
AFTER INSERT OR UPDATE OF user_id, role ON public.user_roles
FOR EACH ROW
WHEN (NEW.role = 'student')
EXECUTE FUNCTION public.ensure_student_referral_code();

GRANT EXECUTE ON FUNCTION public.create_student_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_slug() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_referral_slug() TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.discount_codes dc
      WHERE dc.owner_user_id = p.user_id
        AND dc.is_referral = true
        AND dc.is_active = true
        AND COALESCE(trim(dc.short_code), '') <> ''
    )
  LOOP
    PERFORM 1 FROM public.create_student_referral_code(r.user_id);
  END LOOP;
END $$;