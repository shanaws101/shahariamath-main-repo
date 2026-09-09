
-- Legacy students table for CSV import / auto-detection during signup
CREATE TABLE public.legacy_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text NOT NULL,
  email text,
  department text,
  year integer,
  student_id text,
  is_claimed boolean NOT NULL DEFAULT false,
  claimed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup during signup
CREATE INDEX idx_legacy_students_phone ON public.legacy_students(phone);
CREATE INDEX idx_legacy_students_email ON public.legacy_students(email);

ALTER TABLE public.legacy_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage legacy students"
  ON public.legacy_students FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can check legacy students by phone"
  ON public.legacy_students FOR SELECT
  USING (true);
