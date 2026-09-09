CREATE OR REPLACE FUNCTION public.enforce_no_year_course_types()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.course_type IS NOT NULL
     AND lower(trim(NEW.course_type)) IN ('ssc', 'hsc', 'mba', 'job preparation', 'job_preparation')
  THEN
    NEW.compatible_years := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subjects_enforce_no_year ON public.subjects;
CREATE TRIGGER trg_subjects_enforce_no_year
BEFORE INSERT OR UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_no_year_course_types();

-- Backfill any existing rows that violate the rule
UPDATE public.subjects
SET compatible_years = NULL
WHERE compatible_years IS NOT NULL
  AND lower(trim(course_type)) IN ('ssc', 'hsc', 'mba', 'job preparation', 'job_preparation');