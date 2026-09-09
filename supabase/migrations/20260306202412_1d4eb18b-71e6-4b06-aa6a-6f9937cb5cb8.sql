
-- Create student_onboarding table
CREATE TABLE public.student_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  whatsapp_number text,
  alternative_phone text,
  session text,
  student_type text,
  facebook_id_name text,
  college_name text,
  division text,
  district text,
  referral_source text,
  has_complaint boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_onboarding ENABLE ROW LEVEL SECURITY;

-- Users can insert their own row
CREATE POLICY "Users can insert own onboarding" ON public.student_onboarding
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own row
CREATE POLICY "Users can update own onboarding" ON public.student_onboarding
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can view their own row
CREATE POLICY "Users can view own onboarding" ON public.student_onboarding
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Admins can manage all
CREATE POLICY "Admins can manage onboarding" ON public.student_onboarding
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
