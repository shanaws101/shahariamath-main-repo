-- Update generate_student_id() function to produce 'SMC-YYYY-XXXXXX'
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_count INTEGER;
    current_year INTEGER;
BEGIN
    SELECT year INTO current_year FROM student_id_counter WHERE id = 1;
    UPDATE student_id_counter SET current_count = current_count + 1 WHERE id = 1 RETURNING current_count INTO new_count;
    RETURN 'SMC-' || current_year || '-' || LPAD(new_count::TEXT, 6, '0');
END;
$$;

-- Update any existing student profiles with SMC prefix to OSA
UPDATE public.profiles
SET student_id = REPLACE(student_id, 'SMC-', 'SMC-')
WHERE student_id LIKE 'SMC-%';
