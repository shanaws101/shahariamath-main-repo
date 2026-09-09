
CREATE TABLE public.cart_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bundle_id uuid NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, bundle_id)
);

ALTER TABLE public.cart_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart bundles"
  ON public.cart_bundles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
