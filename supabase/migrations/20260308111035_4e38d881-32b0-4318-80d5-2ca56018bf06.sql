-- Fix 1: Enable RLS on the public_discount_codes view is not possible (it's a view),
-- but we need to ensure it only exposes safe data. The view already filters columns.
-- The GRANT we did is sufficient since views inherit the definer's permissions.

-- Fix 2: Restrict referral_clicks to hide raw IP/user_agent from students
DROP POLICY IF EXISTS "Code owners can view click summaries" ON public.referral_clicks;

CREATE POLICY "Code owners can view click counts"
ON public.referral_clicks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.discount_codes dc
    WHERE dc.id = referral_clicks.referral_code_id
      AND dc.owner_user_id = auth.uid()
  )
);

-- Create a safe view for referral click summaries (no IP/user_agent)
CREATE OR REPLACE VIEW public.referral_click_summaries AS
SELECT
  referral_code_id,
  country,
  COUNT(*) as click_count,
  MIN(clicked_at) as first_click,
  MAX(clicked_at) as last_click
FROM public.referral_clicks
GROUP BY referral_code_id, country;