
-- Add sub_role to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS sub_role text NOT NULL DEFAULT 'content_writer';

-- Add expanded permissions to employee_permissions
ALTER TABLE public.employee_permissions 
  ADD COLUMN IF NOT EXISTS can_manage_cms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_carousel boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_students boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_subjects boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_enrollments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_calendar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_discount_codes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_referral_codes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_videos boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_pdfs boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_analytics boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_gallery boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_manage_subject_cms boolean NOT NULL DEFAULT false;
