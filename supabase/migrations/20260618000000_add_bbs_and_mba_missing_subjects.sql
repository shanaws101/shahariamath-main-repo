-- Add BBS course subjects and the missing MBA department subjects.
-- This keeps the public course lists and admin subject-management data in sync.

-- BBS should behave like other no-year course tracks in the database trigger.
CREATE OR REPLACE FUNCTION public.enforce_no_year_course_types()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.course_type IS NOT NULL
     AND lower(trim(NEW.course_type)) IN ('ssc', 'hsc', 'mba', 'bbs', 'job preparation', 'job_preparation')
  THEN
    NEW.compatible_years := NULL;
  END IF;
  RETURN NEW;
END;
$$;

INSERT INTO public.subjects (name, name_bn, slug, department, compatible_years, subject_type, course_type, price, is_visible) VALUES
('Principles of Accounting', 'হিসাববিজ্ঞানের মূলনীতি', 'bbs-general-principles-of-accounting', 'general', NULL, 'Math', 'BBS', 500, true),
('Microeconomics', 'ব্যষ্টিক অর্থনীতি', 'bbs-general-microeconomics', 'general', NULL, 'Theory+Graph', 'BBS', 500, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bbs-general-taxation-in-bangladesh', 'general', NULL, 'Math', 'BBS', 500, true),
('Intermediate Accounting', 'মধ্যবর্তী হিসাববিজ্ঞান', 'bbs-general-intermediate-accounting', 'general', NULL, 'Math', 'BBS', 500, true),
('Advanced Accounting-I', 'উচ্চতর হিসাববিজ্ঞান-১', 'bbs-general-advanced-accounting-1', 'general', NULL, 'Math', 'BBS', 500, true),
('Cost Accounting', 'ব্যয় হিসাববিজ্ঞান', 'bbs-general-cost-accounting', 'general', NULL, 'Math', 'BBS', 500, true),
('English', 'ইংরেজি', 'bbs-general-english', 'general', NULL, 'Theory', 'BBS', 500, true),
('Corporate Governance', 'কর্পোরেট গভর্নেন্স', 'mba-finance-corporate-governance', 'finance', NULL, 'Math', 'MBA', 800, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  name_bn = EXCLUDED.name_bn,
  department = EXCLUDED.department,
  compatible_years = EXCLUDED.compatible_years,
  subject_type = EXCLUDED.subject_type,
  course_type = EXCLUDED.course_type,
  price = EXCLUDED.price,
  is_visible = EXCLUDED.is_visible;

UPDATE public.subjects
SET subject_type = 'Theory'
WHERE slug = 'mba-management-strategic-management';
