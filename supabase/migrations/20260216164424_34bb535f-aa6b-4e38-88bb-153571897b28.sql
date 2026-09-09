
-- Phase 1: Unified Referral + Discount Engine

-- 1. Add 'employee' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';

-- 2. Extend discount_codes table with referral columns
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'system' CHECK (owner_type IN ('student', 'employee', 'system')),
  ADD COLUMN IF NOT EXISTS discount_percent_receiver numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent_owner numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_referral boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_code text UNIQUE;

-- 3. Referral clicks tracking
CREATE TABLE public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  ip text,
  user_agent text,
  country text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral clicks"
  ON public.referral_clicks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Code owners can view their clicks"
  ON public.referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_codes dc
      WHERE dc.id = referral_code_id AND dc.owner_user_id = auth.uid()
    )
  );

-- 4. Referral conversions
CREATE TABLE public.referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  new_user_id uuid NOT NULL,
  purchase_id uuid REFERENCES public.payments(id),
  converted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage conversions"
  ON public.referral_conversions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Code owners can view their conversions"
  ON public.referral_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_codes dc
      WHERE dc.id = referral_code_id AND dc.owner_user_id = auth.uid()
    )
  );

-- 5. Pending referrals (browser fingerprint tracking)
CREATE TABLE public.pending_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  browser_fingerprint text NOT NULL,
  ip text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pending referrals"
  ON public.pending_referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Public insert for edge function (service role)
CREATE POLICY "Anyone can insert pending referrals"
  ON public.pending_referrals FOR INSERT
  WITH CHECK (true);

-- 6. Earned discounts
CREATE TABLE public.earned_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  discount_percent numeric NOT NULL DEFAULT 0,
  redeemed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.earned_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage earned discounts"
  ON public.earned_discounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own earned discounts"
  ON public.earned_discounts FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Update discount_codes RLS for employees
CREATE POLICY "Employees can view their own codes"
  ON public.discount_codes FOR SELECT
  USING (owner_user_id = auth.uid());

-- 8. Indexes for performance
CREATE INDEX idx_referral_clicks_code ON public.referral_clicks(referral_code_id);
CREATE INDEX idx_referral_clicks_ip ON public.referral_clicks(ip);
CREATE INDEX idx_referral_conversions_code ON public.referral_conversions(referral_code_id);
CREATE INDEX idx_referral_conversions_user ON public.referral_conversions(new_user_id);
CREATE INDEX idx_pending_referrals_fingerprint ON public.pending_referrals(browser_fingerprint);
CREATE INDEX idx_pending_referrals_expires ON public.pending_referrals(expires_at);
CREATE INDEX idx_earned_discounts_user ON public.earned_discounts(user_id);
CREATE INDEX idx_discount_codes_short_code ON public.discount_codes(short_code);
CREATE INDEX idx_discount_codes_owner ON public.discount_codes(owner_user_id);
