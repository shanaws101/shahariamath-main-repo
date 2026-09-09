CREATE OR REPLACE FUNCTION public.get_or_create_referral_slug()
 RETURNS TABLE(code_id uuid, slug text, code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _existing RECORD;
  _new_slug TEXT;
  _new_code TEXT;
  _new_id UUID;
  _attempt INT := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, short_code, code INTO _existing
  FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    code_id := _existing.id;
    slug := _existing.short_code;
    code := _existing.code;
    RETURN NEXT;
    RETURN;
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug) OR _attempt > 8;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  INSERT INTO public.discount_codes (
    code, short_code, owner_user_id, owner_type, is_referral,
    is_active, discount_type, discount_value,
    discount_percent_owner, discount_percent_receiver
  ) VALUES (
    _new_code, _new_slug, _uid, 'student', true,
    true, 'fixed', 100, 0, 0
  ) RETURNING id INTO _new_id;

  code_id := _new_id;
  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

-- Backfill: create a referral code for every existing student who doesn't have one yet
DO $$
DECLARE
  r RECORD;
  _slug TEXT;
  _code TEXT;
  _attempt INT;
BEGIN
  FOR r IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'student'
      AND NOT EXISTS (
        SELECT 1 FROM public.discount_codes dc
        WHERE dc.owner_user_id = ur.user_id AND dc.is_referral = true
      )
  LOOP
    _attempt := 0;
    LOOP
      _attempt := _attempt + 1;
      _slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text || r.user_id::text) for 6));
      EXIT WHEN public.is_slug_available(_slug) OR _attempt > 8;
    END LOOP;
    _code := upper(replace(_slug, 'oli-', 'OLI'));
    BEGIN
      INSERT INTO public.discount_codes (
        code, short_code, owner_user_id, owner_type, is_referral,
        is_active, discount_type, discount_value,
        discount_percent_owner, discount_percent_receiver
      ) VALUES (
        _code, _slug, r.user_id, 'student', true,
        true, 'fixed', 100, 0, 0
      );
    EXCEPTION WHEN unique_violation THEN
      -- skip, will retry next time the user opens the page
      NULL;
    END;
  END LOOP;
END $$;