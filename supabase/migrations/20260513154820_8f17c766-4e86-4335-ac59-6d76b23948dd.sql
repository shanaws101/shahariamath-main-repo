
-- =========================================================
-- Refer & Earn — points engine + server-trust attribution
-- =========================================================

-- 1. Points ledger (append-only)
CREATE TABLE public.referral_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('referral_signup','redemption','admin_adjust')),
  referred_user_id UUID,
  enrollment_id UUID,
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpl_user ON public.referral_points_ledger(user_id);
CREATE UNIQUE INDEX idx_rpl_award_once
  ON public.referral_points_ledger(user_id, referred_user_id, enrollment_id)
  WHERE reason = 'referral_signup';

ALTER TABLE public.referral_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ledger"
  ON public.referral_points_ledger FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage ledger"
  ON public.referral_points_ledger FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2. Redemptions (one per payment)
CREATE TABLE public.referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_id UUID NOT NULL UNIQUE,
  points_used INTEGER NOT NULL CHECK (points_used > 0),
  bdt_value NUMERIC NOT NULL CHECK (bdt_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rr_user ON public.referral_redemptions(user_id);

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage redemptions"
  ON public.referral_redemptions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3. Server-side referrer attribution (one-shot, immutable from client)
CREATE TABLE public.referral_attributions (
  referred_user_id UUID PRIMARY KEY,
  referral_code_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ra_code ON public.referral_attributions(referral_code_id);

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attribution"
  ON public.referral_attributions FOR SELECT
  USING (auth.uid() = referred_user_id);
CREATE POLICY "Admins manage attributions"
  ON public.referral_attributions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 4. referral_conversions: track points awarded
ALTER TABLE public.referral_conversions
  ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 200;

-- 5. payments: pending redemption tied to a payment row (server-set only)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pending_redemption_points INTEGER;

-- 6. Slug uniqueness on discount_codes.short_code (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_discount_short_code_ci
  ON public.discount_codes (lower(short_code))
  WHERE short_code IS NOT NULL;

-- =========================================================
-- Functions
-- =========================================================

-- Slug regex check
CREATE OR REPLACE FUNCTION public.is_slug_available(_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _slug IS NULL OR _slug !~ '^[a-z0-9-]{4,20}$' THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.discount_codes WHERE lower(short_code) = lower(_slug)
  );
END;
$$;

-- Get or create the calling user's referral slug + code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_slug()
RETURNS TABLE(code_id UUID, slug TEXT, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    true, 'flat', 100, 0, 0
  ) RETURNING id INTO _new_id;

  code_id := _new_id;
  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$$;

-- Update slug
CREATE OR REPLACE FUNCTION public.update_referral_slug(_new_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _normalized TEXT := lower(trim(_new_slug));
  _code_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF _normalized !~ '^[a-z0-9-]{4,20}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_format');
  END IF;
  IF EXISTS (SELECT 1 FROM public.discount_codes
             WHERE lower(short_code) = _normalized AND owner_user_id <> _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'taken');
  END IF;

  SELECT id INTO _code_id FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC LIMIT 1;

  IF _code_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_code');
  END IF;

  UPDATE public.discount_codes
  SET short_code = _normalized, updated_at = now()
  WHERE id = _code_id;

  RETURN jsonb_build_object('ok', true, 'slug', _normalized);
END;
$$;

-- Balance = SUM of ledger
CREATE OR REPLACE FUNCTION public.get_referral_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM public.referral_points_ledger
  WHERE user_id = _user_id;
$$;

-- Award referral points (idempotent)
CREATE OR REPLACE FUNCTION public.award_referral_points(
  _referrer UUID, _referred UUID, _enrollment UUID, _payment UUID, _code_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _referrer IS NULL OR _referred IS NULL OR _referrer = _referred THEN
    RETURN false;
  END IF;

  INSERT INTO public.referral_points_ledger (user_id, points, reason, referred_user_id, enrollment_id, payment_id)
  VALUES (_referrer, 200, 'referral_signup', _referred, _enrollment, _payment)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.referral_conversions (referral_code_id, new_user_id, purchase_id, points_awarded)
  VALUES (_code_id, _referred, _payment, 200)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- Apply redemption — server-truth caps
CREATE OR REPLACE FUNCTION public.apply_redemption(
  _user UUID, _payment UUID, _requested_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance INTEGER;
  _payment_amt NUMERIC;
  _payment_status TEXT;
  _payment_user UUID;
  _capped INTEGER;
  _bdt NUMERIC;
BEGIN
  IF _user IS NULL OR _payment IS NULL THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'bad_input');
  END IF;

  SELECT user_id, amount, status::TEXT INTO _payment_user, _payment_amt, _payment_status
  FROM public.payments WHERE id = _payment;

  IF _payment_user IS NULL OR _payment_user <> _user THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'not_owner');
  END IF;
  IF _payment_status <> 'pending' THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'not_pending');
  END IF;
  IF EXISTS (SELECT 1 FROM public.referral_redemptions WHERE payment_id = _payment) THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'already_redeemed');
  END IF;

  _balance := public.get_referral_balance(_user);

  IF _balance < 50 OR _requested_points < 50 THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'min_50');
  END IF;

  -- Cap = min(requested, balance, payment_amount)
  _capped := LEAST(_requested_points, _balance, FLOOR(_payment_amt)::INTEGER);
  IF _capped < 50 THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'cap_below_min');
  END IF;

  _bdt := _capped::NUMERIC;

  INSERT INTO public.referral_redemptions (user_id, payment_id, points_used, bdt_value)
  VALUES (_user, _payment, _capped, _bdt);

  INSERT INTO public.referral_points_ledger (user_id, points, reason, payment_id)
  VALUES (_user, -_capped, 'redemption', _payment);

  UPDATE public.payments
  SET amount = amount - _bdt,
      pending_redemption_points = _capped,
      updated_at = now()
  WHERE id = _payment;

  RETURN jsonb_build_object(
    'applied_points', _capped,
    'applied_bdt', _bdt,
    'new_amount', _payment_amt - _bdt
  );
END;
$$;

-- Admin report
CREATE OR REPLACE FUNCTION public.get_admin_referral_report(_from TIMESTAMPTZ, _to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_links', (SELECT COUNT(*) FROM public.discount_codes WHERE is_referral = true AND owner_type = 'student'),
    'total_referrals', (SELECT COUNT(*) FROM public.referral_conversions WHERE converted_at BETWEEN _from AND _to),
    'total_points_issued', (SELECT COALESCE(SUM(points),0) FROM public.referral_points_ledger
                            WHERE reason = 'referral_signup' AND created_at BETWEEN _from AND _to),
    'total_bdt_discounted', (SELECT COALESCE(SUM(bdt_value),0) FROM public.referral_redemptions
                             WHERE created_at BETWEEN _from AND _to),
    'top_referrers', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT
          p.full_name,
          p.student_id,
          dc.short_code,
          COUNT(rc.id) AS referrals,
          COALESCE(SUM(rc.points_awarded),0) AS points
        FROM public.discount_codes dc
        JOIN public.profiles p ON p.user_id = dc.owner_user_id
        LEFT JOIN public.referral_conversions rc ON rc.referral_code_id = dc.id
          AND rc.converted_at BETWEEN _from AND _to
        WHERE dc.is_referral = true AND dc.owner_type = 'student'
        GROUP BY p.full_name, p.student_id, dc.short_code
        ORDER BY referrals DESC, points DESC
        LIMIT 10
      ) t
    )
  ) INTO _result;

  RETURN _result;
END;
$$;
