BEGIN;

UPDATE public.subjects
SET
  price = 1200,
  original_price = 1500,
  updated_at = NOW()
WHERE price IS DISTINCT FROM 1200
   OR original_price IS DISTINCT FROM 1500;

COMMIT;
