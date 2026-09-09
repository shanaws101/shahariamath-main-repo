
-- Fix security definer view - use security_invoker instead
DROP VIEW IF EXISTS public.public_discount_codes;
CREATE OR REPLACE VIEW public.public_discount_codes
WITH (security_invoker = true)
AS SELECT code, discount_value, discount_type, valid_from, valid_until, subject_id, is_referral, discount_percent_receiver
FROM public.discount_codes
WHERE is_active = true AND (valid_until IS NULL OR valid_until > now());

-- Re-add a limited public SELECT policy for the view to work
CREATE POLICY "Anyone can view active discount codes limited"
ON public.discount_codes
FOR SELECT
USING (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
);
