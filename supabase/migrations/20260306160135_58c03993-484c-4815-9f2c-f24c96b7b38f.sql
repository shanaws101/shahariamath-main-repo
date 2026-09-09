
-- Bundles table
CREATE TABLE public.bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT,
  department TEXT,
  year INTEGER,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  cover_image_url TEXT,
  description TEXT,
  description_bn TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bundle-subjects relation
CREATE TABLE public.bundle_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(bundle_id, subject_id)
);

-- Cart items
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

-- Math pricing tiers (configurable by admin)
CREATE TABLE public.math_pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quantity INTEGER NOT NULL UNIQUE,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default math pricing tiers
INSERT INTO public.math_pricing_tiers (quantity, discount_percent) VALUES
  (1, 0),
  (2, 10),
  (3, 13),
  (4, 16),
  (5, 19),
  (6, 22),
  (7, 26),
  (8, 30);

-- RLS for bundles
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible bundles"
  ON public.bundles FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admins can view all bundles"
  ON public.bundles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bundles"
  ON public.bundles FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS for bundle_subjects
ALTER TABLE public.bundle_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bundle subjects"
  ON public.bundle_subjects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage bundle subjects"
  ON public.bundle_subjects FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS for cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for math_pricing_tiers
ALTER TABLE public.math_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing tiers"
  ON public.math_pricing_tiers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pricing tiers"
  ON public.math_pricing_tiers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for bundles
CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
