-- Remove the public policy that leaks sensitive discount code data
DROP POLICY IF EXISTS "Anyone can view active discount codes limited" ON public.discount_codes;

-- Ensure the public_discount_codes view has a proper public select policy instead
-- Grant anon access to the safe view
GRANT SELECT ON public.public_discount_codes TO anon;
GRANT SELECT ON public.public_discount_codes TO authenticated;