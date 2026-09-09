-- Create discount_codes table for coupons and referral codes
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage discount codes
CREATE POLICY "Admins can manage discount codes"
ON public.discount_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Anyone can view active discount codes (for validation during checkout)
CREATE POLICY "Anyone can view active discount codes"
ON public.discount_codes
FOR SELECT
USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- Create trigger for updated_at
CREATE TRIGGER update_discount_codes_updated_at
BEFORE UPDATE ON public.discount_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for code lookups
CREATE INDEX idx_discount_codes_code ON public.discount_codes(code);
CREATE INDEX idx_discount_codes_subject_id ON public.discount_codes(subject_id);