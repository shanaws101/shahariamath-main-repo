
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

  -- Generate a new unique slug
  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug) OR _attempt > 12;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  -- Find existing active referral row for this user
  SELECT id INTO _existing_id
  FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.discount_codes
    SET short_code = _new_slug, code = _new_code, updated_at = now()
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

GRANT EXECUTE ON FUNCTION public.regenerate_referral_slug() TO authenticated;
