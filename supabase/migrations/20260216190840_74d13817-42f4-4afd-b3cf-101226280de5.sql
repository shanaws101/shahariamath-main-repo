-- Allow students to create their own referral codes
CREATE POLICY "Students can create own referral codes"
ON public.discount_codes
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id AND is_referral = true AND owner_type = 'student');

-- Allow students to view their own codes
CREATE POLICY "Students can view own codes"
ON public.discount_codes
FOR SELECT
USING (owner_user_id = auth.uid());