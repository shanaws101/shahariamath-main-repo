CREATE OR REPLACE FUNCTION public.get_checkout_discount(_code text)
RETURNS TABLE(
  code_id uuid,
  code text,
  short_code text,
  discount_type text,
  discount_value numeric,
  is_referral boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    dc.id AS code_id,
    dc.code,
    dc.short_code,
    dc.discount_type,
    dc.discount_value,
    COALESCE(dc.is_referral, false) AS is_referral
  FROM public.discount_codes dc
  WHERE dc.is_active = true
    AND (_code IS NOT NULL AND trim(_code) <> '')
    AND (
      lower(dc.short_code) = lower(trim(_code))
      OR lower(dc.code) = lower(trim(_code))
    )
    AND (dc.valid_from IS NULL OR dc.valid_from <= now())
    AND (dc.valid_until IS NULL OR dc.valid_until >= now())
    AND (dc.max_uses IS NULL OR dc.current_uses < dc.max_uses)
    AND NOT (
      COALESCE(dc.is_referral, false) = true
      AND dc.owner_user_id IS NOT NULL
      AND dc.owner_user_id = auth.uid()
    )
  ORDER BY COALESCE(dc.is_referral, false) DESC, dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkout_discount(text) TO anon, authenticated;