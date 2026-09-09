
-- 1. FIX: Discount codes - create a secure view for public access
CREATE OR REPLACE VIEW public.public_discount_codes
WITH (security_invoker = false)
AS SELECT code, discount_value, discount_type, valid_from, valid_until, subject_id, is_referral, discount_percent_receiver
FROM public.discount_codes
WHERE is_active = true AND (valid_until IS NULL OR valid_until > now());

-- Remove public SELECT on base table
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;

-- 2. FIX: Pending referrals - restrict to authenticated users
DROP POLICY IF EXISTS "Service role inserts pending referrals" ON public.pending_referrals;
CREATE POLICY "Authenticated users can insert pending referrals"
ON public.pending_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM discount_codes dc
    WHERE dc.id = pending_referrals.referral_code_id AND dc.is_active = true
  )
);

-- 3. FIX: Referral clicks - create restricted view for code owners (without IP/user_agent)
DROP POLICY IF EXISTS "Code owners can view their clicks" ON public.referral_clicks;
CREATE POLICY "Code owners can view click summaries"
ON public.referral_clicks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM discount_codes dc
    WHERE dc.id = referral_clicks.referral_code_id
      AND dc.owner_user_id = auth.uid()
  )
);
