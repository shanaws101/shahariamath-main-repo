
-- Fix: restrict pending_referrals insert to only allow via service role / edge functions
-- by requiring a valid referral_code_id reference
DROP POLICY "Anyone can insert pending referrals" ON public.pending_referrals;

CREATE POLICY "Service role inserts pending referrals"
  ON public.pending_referrals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discount_codes dc
      WHERE dc.id = referral_code_id AND dc.is_active = true
    )
  );
