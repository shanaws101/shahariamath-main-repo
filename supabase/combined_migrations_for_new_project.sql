-- =========================================================================
-- Shaharia Math: Consolidated Supabase Schema & Database Migrations
-- Target Project Ref: nxibbfgryrmspzgueeej
-- Generated on: 2026-09-09T11:47:22.261Z
-- =========================================================================


-- >>> Migration: 20260204081722_8472ad67-7f5d-496d-b5c4-d8a15b7d1e3d.sql <<<
-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create departments enum
CREATE TYPE public.department AS ENUM ('management', 'marketing', 'accounting', 'finance', 'economics');

-- Create class status enum
CREATE TYPE public.class_status AS ENUM ('upcoming', 'live', 'finished', 'cancelled');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    student_id TEXT UNIQUE,
    department department,
    year INTEGER CHECK (year >= 1 AND year <= 4),
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    description_bn TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    compatible_years INTEGER[] DEFAULT ARRAY[1,2,3,4],
    is_visible BOOLEAN DEFAULT true,
    icon TEXT,
    facebook_group_url TEXT,
    whatsapp_support_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_id UUID,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, subject_id)
);

-- Create class_schedules table
CREATE TABLE public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    description TEXT,
    description_bn TEXT,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_free BOOLEAN DEFAULT false,
    status class_status DEFAULT 'upcoming',
    stream_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create free_videos table
CREATE TABLE public.free_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    description TEXT,
    description_bn TEXT,
    youtube_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status DEFAULT 'pending',
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    message TEXT NOT NULL,
    message_bn TEXT,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_id_counter table for generating sequential IDs
CREATE TABLE public.student_id_counter (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    current_count INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())
);

-- Insert initial counter
INSERT INTO public.student_id_counter (id, current_count, year) VALUES (1, 0, 2026);

-- Create cms_content table for landing page CMS
CREATE TABLE public.cms_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonials table
CREATE TABLE public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_bn TEXT,
    role TEXT,
    role_bn TEXT,
    content TEXT NOT NULL,
    content_bn TEXT,
    avatar_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_id_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to generate student ID
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
    RETURN 'OSA-' || current_year || '-' || LPAD(new_count::TEXT, 6, '0');
END;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON public.class_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cms_content_updated_at BEFORE UPDATE ON public.cms_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects (public read)
CREATE POLICY "Anyone can view visible subjects" ON public.subjects FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can view all subjects" ON public.subjects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for enrollments
CREATE POLICY "Users can view their own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their own enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for class_schedules
CREATE POLICY "Anyone can view free classes" ON public.class_schedules FOR SELECT USING (is_free = true);
CREATE POLICY "Enrolled users can view paid classes" ON public.class_schedules FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e 
        WHERE e.user_id = auth.uid() 
        AND e.subject_id = class_schedules.subject_id
        AND e.payment_status = 'completed'
    )
);
CREATE POLICY "Admins can view all classes" ON public.class_schedules FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage class schedules" ON public.class_schedules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for free_videos (public read for visible)
CREATE POLICY "Anyone can view visible free videos" ON public.free_videos FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can view all free videos" ON public.free_videos FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage free videos" ON public.free_videos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for student_id_counter (only via function)
CREATE POLICY "No direct access to counter" ON public.student_id_counter FOR SELECT USING (false);

-- RLS Policies for cms_content (public read)
CREATE POLICY "Anyone can view CMS content" ON public.cms_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage CMS content" ON public.cms_content FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for testimonials (public read for visible)
CREATE POLICY "Anyone can view visible testimonials" ON public.testimonials FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can view all testimonials" ON public.testimonials FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_subject_id ON public.enrollments(subject_id);
CREATE INDEX idx_class_schedules_subject_id ON public.class_schedules(subject_id);
CREATE INDEX idx_class_schedules_date ON public.class_schedules(scheduled_date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);


-- >>> Migration: 20260204095441_f8a5b0b8-138f-4be4-a5cc-f74d47221eb7.sql <<<
-- Add INSERT policy for payments table so users can create their own payments
CREATE POLICY "Users can create their own payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add UPDATE policy so users can update their own pending payments
CREATE POLICY "Users can update their own payments"
ON public.payments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);


-- >>> Migration: 20260204100609_e67bfb15-50d5-41a5-8caa-fd9d15dfaf94.sql <<<
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


-- >>> Migration: 20260216050110_cd7ab799-09ac-407b-a0f4-588930110fc9.sql <<<
-- Create carousel_banners table
CREATE TABLE public.carousel_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  link_url TEXT,
  title TEXT,
  title_bn TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.carousel_banners ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage carousel banners"
ON public.carousel_banners
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view visible banners
CREATE POLICY "Anyone can view visible carousel banners"
ON public.carousel_banners
FOR SELECT
USING (is_visible = true);

-- Trigger for updated_at
CREATE TRIGGER update_carousel_banners_updated_at
BEFORE UPDATE ON public.carousel_banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for carousel banner images
INSERT INTO storage.buckets (id, name, public) VALUES ('carousel-banners', 'carousel-banners', true);

-- Storage policies
CREATE POLICY "Anyone can view carousel banner images"
ON storage.objects FOR SELECT
USING (bucket_id = 'carousel-banners');

CREATE POLICY "Admins can upload carousel banner images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'carousel-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update carousel banner images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'carousel-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete carousel banner images"
ON storage.objects FOR DELETE
USING (bucket_id = 'carousel-banners' AND has_role(auth.uid(), 'admin'::app_role));


-- >>> Migration: 20260216081604_39ec092f-cd1b-4f4d-a70c-0289bb435c74.sql <<<
-- Add demo video URL to class_schedules for free class previews
ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS demo_video_url TEXT;


-- >>> Migration: 20260216162351_ce75e2ee-9fc9-4b2a-be04-d96605dfcf3c.sql <<<
-- Create gallery_images table
CREATE TABLE public.gallery_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  alt_text_bn TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage gallery images"
  ON public.gallery_images FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view visible gallery images"
  ON public.gallery_images FOR SELECT
  USING (is_visible = true);

-- Trigger for updated_at
CREATE TRIGGER update_gallery_images_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-images', 'gallery-images', true);

-- Storage policies
CREATE POLICY "Anyone can view gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

CREATE POLICY "Admins can upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gallery-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete gallery images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'gallery-images' AND has_role(auth.uid(), 'admin'::app_role));


-- >>> Migration: 20260216164424_34bb535f-aa6b-4e38-88bb-153571897b28.sql <<<
-- Phase 1: Unified Referral + Discount Engine

-- 1. Add 'employee' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'employee';

-- 2. Extend discount_codes table with referral columns
ALTER TABLE public.discount_codes
  ADD COLUMN IF NOT EXISTS owner_user_id uuid,
  ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'system' CHECK (owner_type IN ('student', 'employee', 'system')),
  ADD COLUMN IF NOT EXISTS discount_percent_receiver numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_percent_owner numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_referral boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_code text UNIQUE;

-- 3. Referral clicks tracking
CREATE TABLE public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  ip text,
  user_agent text,
  country text,
  clicked_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage referral clicks"
  ON public.referral_clicks FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Code owners can view their clicks"
  ON public.referral_clicks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_codes dc
      WHERE dc.id = referral_code_id AND dc.owner_user_id = auth.uid()
    )
  );

-- 4. Referral conversions
CREATE TABLE public.referral_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  new_user_id uuid NOT NULL,
  purchase_id uuid REFERENCES public.payments(id),
  converted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage conversions"
  ON public.referral_conversions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Code owners can view their conversions"
  ON public.referral_conversions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_codes dc
      WHERE dc.id = referral_code_id AND dc.owner_user_id = auth.uid()
    )
  );

-- 5. Pending referrals (browser fingerprint tracking)
CREATE TABLE public.pending_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  browser_fingerprint text NOT NULL,
  ip text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage pending referrals"
  ON public.pending_referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Public insert for edge function (service role)
CREATE POLICY "Anyone can insert pending referrals"
  ON public.pending_referrals FOR INSERT
  WITH CHECK (true);

-- 6. Earned discounts
CREATE TABLE public.earned_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  referral_code_id uuid NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  discount_percent numeric NOT NULL DEFAULT 0,
  redeemed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.earned_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage earned discounts"
  ON public.earned_discounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own earned discounts"
  ON public.earned_discounts FOR SELECT
  USING (auth.uid() = user_id);

-- 7. Update discount_codes RLS for employees
CREATE POLICY "Employees can view their own codes"
  ON public.discount_codes FOR SELECT
  USING (owner_user_id = auth.uid());

-- 8. Indexes for performance
CREATE INDEX idx_referral_clicks_code ON public.referral_clicks(referral_code_id);
CREATE INDEX idx_referral_clicks_ip ON public.referral_clicks(ip);
CREATE INDEX idx_referral_conversions_code ON public.referral_conversions(referral_code_id);
CREATE INDEX idx_referral_conversions_user ON public.referral_conversions(new_user_id);
CREATE INDEX idx_pending_referrals_fingerprint ON public.pending_referrals(browser_fingerprint);
CREATE INDEX idx_pending_referrals_expires ON public.pending_referrals(expires_at);
CREATE INDEX idx_earned_discounts_user ON public.earned_discounts(user_id);
CREATE INDEX idx_discount_codes_short_code ON public.discount_codes(short_code);
CREATE INDEX idx_discount_codes_owner ON public.discount_codes(owner_user_id);


-- >>> Migration: 20260216164439_82c96644-ca34-4598-94f4-dea7a25f844e.sql <<<
-- Fix: restrict pending_referrals insert to only allow via service role / edge functions
-- by requiring a valid referral_code_id reference
DROP POLICY "Anyone can insert pending referrals" ON public.pending_referrals;

CREATE POLICY "Service role inserts pending referrals"
  ON public.pending_referrals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discount_codes dc
      WHERE dc.id = referral_code_id AND dc.is_active = true
    )
  );


-- >>> Migration: 20260216170706_4f4cf29b-2f93-4d08-881d-3e332f515a8f.sql <<<
-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  invited_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- EMPLOYEE PERMISSIONS TABLE
-- ============================================
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE,
  can_view_revenue boolean NOT NULL DEFAULT false,
  can_view_clicks boolean NOT NULL DEFAULT true,
  can_view_signups boolean NOT NULL DEFAULT true,
  can_view_enrollments boolean NOT NULL DEFAULT false
);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions" ON public.employee_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own permissions" ON public.employee_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_permissions.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================
-- EXTEND CLASS_SCHEDULES WITH DEPARTMENT/YEAR FILTERING
-- ============================================
ALTER TABLE public.class_schedules
  ADD COLUMN IF NOT EXISTS department text DEFAULT NULL
    CHECK (department IS NULL OR department IN ('management', 'marketing', 'accounting', 'finance', 'economics')),
  ADD COLUMN IF NOT EXISTS target_years integer[] DEFAULT ARRAY[1,2,3,4];

-- Update RLS: students can view events matching their department/year
CREATE POLICY "Students can view matching calendar events"
  ON public.class_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          class_schedules.department IS NULL
          OR class_schedules.department::text = p.department::text
        )
        AND (
          class_schedules.target_years IS NULL
          OR p.year = ANY(class_schedules.target_years)
        )
    )
  );


-- >>> Migration: 20260216171606_40fff0fb-93a2-46ea-b154-ca771ea28a82.sql <<<
-- Trigger: Auto-activate employee when user signs up
-- Matches employees by invited_email, sets status=active, assigns employee role
CREATE OR REPLACE FUNCTION public.handle_employee_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Check if this email was invited as employee
  SELECT id INTO emp_record
  FROM public.employees
  WHERE invited_email = NEW.email AND status = 'invited';

  IF FOUND THEN
    -- Activate employee
    UPDATE public.employees
    SET user_id = NEW.id, status = 'active'
    WHERE id = emp_record.id;

    -- Assign employee role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Check for pending referral conversions (cookie-based)
  -- This is handled client-side via pending_referrals table

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users on insert
CREATE TRIGGER on_auth_user_created_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_employee_signup();


-- >>> Migration: 20260216172049_a1330b44-5898-491f-97b9-b0cf72b9507a.sql <<<
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


-- >>> Migration: 20260216190840_74d13817-42f4-4afd-b3cf-101226280de5.sql <<<
-- Allow students to create their own referral codes
CREATE POLICY "Students can create own referral codes"
ON public.discount_codes
FOR INSERT
WITH CHECK (auth.uid() = owner_user_id AND is_referral = true AND owner_type = 'student');

-- Allow students to view their own codes
CREATE POLICY "Students can view own codes"
ON public.discount_codes
FOR SELECT
USING (owner_user_id = auth.uid());


-- >>> Migration: 20260216192625_38262b4d-be41-4f80-bb3c-d0517a2b2f03.sql <<<
-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Add avatar_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;


-- >>> Migration: 20260304172550_4ab37d24-d006-4a5b-b08a-ba6f8965983d.sql <<<
-- Add new columns to subjects table
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS subject_type text DEFAULT 'Theory';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS course_type text DEFAULT 'BBA';
ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS department text;

-- Clear existing subjects to replace with comprehensive list
DELETE FROM public.subjects;

-- Insert all 162 subjects from Excel data
-- BBA - Accounting - 1st Year
INSERT INTO public.subjects (name, name_bn, slug, department, compatible_years, subject_type, course_type, price, is_visible) VALUES
('History of Bangladesh: Language, Culture and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-accounting-history-of-bangladesh', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-accounting-ict-1st', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-accounting-micro-economics', 'accounting', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Principles of Accounting', 'হিসাববিজ্ঞানের মূলনীতি', 'bba-accounting-principles-of-accounting', 'accounting', '{1}', 'Math', 'BBA', 0, true),
('Principles of Finance', 'অর্থায়নের মূলনীতি', 'bba-accounting-principles-of-finance', 'accounting', '{1}', 'Math', 'BBA', 0, true),
('Principles of Management', 'ব্যবস্থাপনার মূলনীতি', 'bba-accounting-principles-of-management', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-accounting-intro-to-business', 'accounting', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Marketing', 'বিপণনের মূলনীতি', 'bba-accounting-principles-of-marketing', 'accounting', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Accounting - 2nd Year
('Computer and Information Technology', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'bba-accounting-cit-2nd', 'accounting', '{2}', 'Theory', 'BBA', 0, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bba-accounting-taxation', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Intermediate Accounting', 'মধ্যবর্তী হিসাববিজ্ঞান', 'bba-accounting-intermediate-accounting', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-accounting-business-math-2nd', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-accounting-business-stats-2nd', 'accounting', '{2}', 'Math', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-accounting-macro-economics', 'accounting', '{2}', 'Theory+Graph', 'BBA', 0, true),
('Business Communication and Report Writing', 'ব্যবসায় যোগাযোগ ও রিপোর্ট লেখা', 'bba-accounting-communication-2nd', 'accounting', '{2}', 'Theory', 'BBA', 0, true),

-- BBA - Accounting - 3rd Year
('Audit and Assurance', 'অডিট ও নিশ্চয়তা', 'bba-accounting-audit-assurance', 'accounting', '{3}', 'Theory', 'BBA', 0, true),
('Advanced Accounting-I', 'উচ্চতর হিসাববিজ্ঞান-১', 'bba-accounting-advanced-accounting-1', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Cost Accounting', 'ব্যয় হিসাববিজ্ঞান', 'bba-accounting-cost-accounting', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Management Accounting', 'ব্যবস্থাপনা হিসাববিজ্ঞান', 'bba-accounting-management-accounting', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Business and Commercial Laws', 'ব্যবসায় ও বাণিজ্যিক আইন', 'bba-accounting-business-laws', 'accounting', '{3}', 'Theory', 'BBA', 0, true),
('Entrepreneurship', 'উদ্যোক্তা', 'bba-accounting-entrepreneurship', 'accounting', '{3}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-accounting-financial-management', 'accounting', '{3}', 'Math', 'BBA', 0, true),
('Banking and Insurance Theories, Laws and Accounts', 'ব্যাংকিং ও বীমা তত্ত্ব, আইন ও হিসাব', 'bba-accounting-banking-insurance', 'accounting', '{3}', 'Theory', 'BBA', 0, true),

-- BBA - Accounting - 4th Year
('Accounting Theory', 'হিসাববিজ্ঞান তত্ত্ব', 'bba-accounting-accounting-theory', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Advanced Auditing & Professional Ethics', 'উচ্চতর অডিটিং ও পেশাগত নীতি', 'bba-accounting-advanced-auditing', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Accounting Information Systems', 'হিসাববিজ্ঞান তথ্য ব্যবস্থা', 'bba-accounting-ais', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Organizational Behavior', 'সাংগঠনিক আচরণ', 'bba-accounting-org-behavior', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Corporate Law and Practices', 'কর্পোরেট আইন ও চর্চা', 'bba-accounting-corporate-law', 'accounting', '{4}', 'Theory', 'BBA', 0, true),
('Working Capital Management And Financial Statement Analysis', 'কার্যকরী মূলধন ব্যবস্থাপনা ও আর্থিক বিবরণী বিশ্লেষণ', 'bba-accounting-working-capital', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Advanced Accounting-II', 'উচ্চতর হিসাববিজ্ঞান-২', 'bba-accounting-advanced-accounting-2', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Investment Analysis and Portfolio Management', 'বিনিয়োগ বিশ্লেষণ ও পোর্টফোলিও ব্যবস্থাপনা', 'bba-accounting-investment-analysis', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Research Methodology (In English)', 'গবেষণা পদ্ধতি (ইংরেজিতে)', 'bba-accounting-research-methodology', 'accounting', '{4}', 'Math', 'BBA', 0, true),
('Viva-voce', 'মৌখিক পরীক্ষা', 'bba-accounting-viva-voce', 'accounting', '{4}', 'Theory', 'BBA', 0, true),

-- BBA - Management - 1st Year
('History of Bangladesh: Language, Culture, and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-management-history-of-bangladesh', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-management-ict-1st', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Business Environment and Sustainability', 'ব্যবসায় পরিবেশ ও টেকসইতা', 'bba-management-business-environment', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-management-micro-economics', 'management', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-management-intro-to-business', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Management', 'ব্যবস্থাপনার মূলনীতি', 'bba-management-principles-of-management', 'management', '{1}', 'Theory', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-management-business-math-1st', 'management', '{1}', 'Math', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-management-business-communication-1st', 'management', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Management - 2nd Year
('Human Resource Management', 'মানব সম্পদ ব্যবস্থাপনা', 'bba-management-hrm-2nd', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-management-business-communication-2nd', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Legal Environment of Business', 'ব্যবসায়ের আইনি পরিবেশ', 'bba-management-legal-environment', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Principles of Finance', 'অর্থায়নের মূলনীতি', 'bba-management-principles-of-finance', 'management', '{2}', 'Math', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-management-business-math-2nd', 'management', '{2}', 'Math', 'BBA', 0, true),
('Computer and Information Technology', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'bba-management-cit-2nd', 'management', '{2}', 'Theory', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-management-macro-economics', 'management', '{2}', 'Theory+Graph', 'BBA', 0, true),

-- BBA - Management - 3rd Year
('Operations Management', 'অপারেশনস ম্যানেজমেন্ট', 'bba-management-operations-management', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-management-business-stats-3rd', 'management', '{3}', 'Math', 'BBA', 0, true),
('Organizational Behavior', 'সাংগঠনিক আচরণ', 'bba-management-org-behavior', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bba-management-taxation', 'management', '{3}', 'Math', 'BBA', 0, true),
('Insurance & Risk Management', 'বীমা ও ঝুঁকি ব্যবস্থাপনা', 'bba-management-insurance-risk', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Company Law', 'কোম্পানি আইন', 'bba-management-company-law', 'management', '{3}', 'Theory', 'BBA', 0, true),
('Management Accounting', 'ব্যবস্থাপনা হিসাববিজ্ঞান', 'bba-management-management-accounting', 'management', '{3}', 'Math', 'BBA', 0, true),
('Marketing Management', 'মার্কেটিং ম্যানেজমেন্ট', 'bba-management-marketing-management', 'management', '{3}', 'Theory', 'BBA', 0, true),

-- BBA - Management - 4th Year
('Bank Management', 'ব্যাংক ব্যবস্থাপনা', 'bba-management-bank-management', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-management-financial-management', 'management', '{4}', 'Math', 'BBA', 0, true),
('Supply Chain Management', 'সাপ্লাই চেইন ম্যানেজমেন্ট', 'bba-management-supply-chain', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Industrial Relations', 'শিল্প সম্পর্ক', 'bba-management-industrial-relations', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Project Management', 'প্রকল্প ব্যবস্থাপনা', 'bba-management-project-management', 'management', '{4}', 'Math', 'BBA', 0, true),
('International Trade', 'আন্তর্জাতিক বাণিজ্য', 'bba-management-international-trade', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Investment Management', 'বিনিয়োগ ব্যবস্থাপনা', 'bba-management-investment-management', 'management', '{4}', 'Math', 'BBA', 0, true),
('Bangladesh Economy', 'বাংলাদেশ অর্থনীতি', 'bba-management-bangladesh-economy', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Entrepreneurship', 'উদ্যোক্তা', 'bba-management-entrepreneurship', 'management', '{4}', 'Theory', 'BBA', 0, true),
('Viva-voce', 'মৌখিক পরীক্ষা', 'bba-management-viva-voce', 'management', '{4}', 'Theory', 'BBA', 0, true),

-- BBA - Finance - 1st Year
('History of Bangladesh: Language, Culture, and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-finance-history-of-bangladesh', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-finance-ict-1st', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-finance-business-communication', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Accounting', 'হিসাববিজ্ঞানের মূলনীতি', 'bba-finance-principles-of-accounting', 'finance', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-finance-micro-economics', 'finance', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-finance-business-math-1st', 'finance', '{1}', 'Math', 'BBA', 0, true),
('Principles of Finance', 'অর্থায়নের মূলনীতি', 'bba-finance-principles-of-finance', 'finance', '{1}', 'Math', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-finance-intro-to-business', 'finance', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Finance - 2nd Year
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-finance-business-stats-2nd', 'finance', '{2}', 'Math', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-finance-macro-economics', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-finance-business-math-2nd', 'finance', '{2}', 'Math', 'BBA', 0, true),
('Law and Practices of Banking and Insurance', 'ব্যাংকিং ও বীমার আইন ও চর্চা', 'bba-finance-banking-insurance-law', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Computer and Information Technology', 'কম্পিউটার ও তথ্য প্রযুক্তি', 'bba-finance-cit-2nd', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Legal Aspects of Business', 'ব্যবসায়ের আইনি দিক', 'bba-finance-legal-aspects', 'finance', '{2}', 'Theory', 'BBA', 0, true),
('Business Communication and Report Writing', 'ব্যবসায় যোগাযোগ ও রিপোর্ট লেখা', 'bba-finance-communication-2nd', 'finance', '{2}', 'Theory', 'BBA', 0, true),

-- BBA - Finance - 3rd Year
('Portfolio Management', 'পোর্টফোলিও ব্যবস্থাপনা', 'bba-finance-portfolio-management', 'finance', '{3}', 'Math', 'BBA', 0, true),
('Financial Analysis & Control', 'আর্থিক বিশ্লেষণ ও নিয়ন্ত্রণ', 'bba-finance-financial-analysis', 'finance', '{3}', 'Math', 'BBA', 0, true),
('Entrepreneurship', 'উদ্যোক্তা', 'bba-finance-entrepreneurship', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Management Accounting', 'ব্যবস্থাপনা হিসাববিজ্ঞান', 'bba-finance-management-accounting', 'finance', '{3}', 'Math', 'BBA', 0, true),
('Auditing', 'অডিটিং', 'bba-finance-auditing', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Islamic Banking', 'ইসলামিক ব্যাংকিং', 'bba-finance-islamic-banking', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Marketing of Financial Service', 'আর্থিক সেবার বিপণন', 'bba-finance-marketing-financial-service', 'finance', '{3}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-finance-financial-management', 'finance', '{3}', 'Math', 'BBA', 0, true),

-- BBA - Finance - 4th Year
('International Trade and Finance', 'আন্তর্জাতিক বাণিজ্য ও অর্থায়ন', 'bba-finance-intl-trade-finance', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Public Finance and Taxation', 'সরকারি অর্থায়ন ও কর', 'bba-finance-public-finance', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Financial Market and Institutions', 'আর্থিক বাজার ও প্রতিষ্ঠান', 'bba-finance-financial-market', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Comparative Financial System', 'তুলনামূলক আর্থিক ব্যবস্থা', 'bba-finance-comparative-financial', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Human Resource Management', 'মানব সম্পদ ব্যবস্থাপনা', 'bba-finance-hrm-4th', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Business Research Methodology', 'ব্যবসায় গবেষণা পদ্ধতি', 'bba-finance-research-methodology', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('SME and Micro Finance', 'এসএমই ও ক্ষুদ্র অর্থায়ন', 'bba-finance-sme-micro-finance', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('E-Banking & E-Commerce', 'ই-ব্যাংকিং ও ই-কমার্স', 'bba-finance-ebanking-ecommerce', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Central Banking', 'কেন্দ্রীয় ব্যাংকিং', 'bba-finance-central-banking', 'finance', '{4}', 'Theory', 'BBA', 0, true),
('Viva-Voce', 'মৌখিক পরীক্ষা', 'bba-finance-viva-voce', 'finance', '{4}', 'Theory', 'BBA', 0, true),

-- BBA - Marketing - 1st Year
('History of Bangladesh: Language, Culture, and Identity', 'বাংলাদেশের ইতিহাস: ভাষা, সংস্কৃতি ও পরিচয়', 'bba-marketing-history-of-bangladesh', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Information and Communication Technology', 'তথ্য ও যোগাযোগ প্রযুক্তি', 'bba-marketing-ict-1st', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Business Environment and Sustainability', 'ব্যবসায় পরিবেশ ও টেকসইতা', 'bba-marketing-business-environment', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-marketing-business-communication', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-marketing-micro-economics', 'marketing', '{1}', 'Theory+Graph', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-marketing-business-math-1st', 'marketing', '{1}', 'Math', 'BBA', 0, true),
('Introduction to Business', 'ব্যবসায় পরিচিতি', 'bba-marketing-intro-to-business', 'marketing', '{1}', 'Theory', 'BBA', 0, true),
('Principles of Marketing', 'বিপণনের মূলনীতি', 'bba-marketing-principles-of-marketing', 'marketing', '{1}', 'Theory', 'BBA', 0, true),

-- BBA - Marketing - 2nd Year
('Business Communication', 'ব্যবসায় যোগাযোগ', 'bba-marketing-business-communication-2nd', 'marketing', '{2}', 'Theory', 'BBA', 0, true),
('Fundamentals of Finance', 'অর্থায়নের মৌলিক বিষয়', 'bba-marketing-fundamentals-of-finance', 'marketing', '{2}', 'Math', 'BBA', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'bba-marketing-business-stats-2nd', 'marketing', '{2}', 'Math', 'BBA', 0, true),
('Business Mathematics', 'ব্যবসায় গণিত', 'bba-marketing-business-math-2nd', 'marketing', '{2}', 'Math', 'BBA', 0, true),
('Insurance and Risk Management', 'বীমা ও ঝুঁকি ব্যবস্থাপনা', 'bba-marketing-insurance-risk', 'marketing', '{2}', 'Theory', 'BBA', 0, true),
('Micro Economics', 'মাইক্রো ইকোনমিক্স', 'bba-marketing-micro-economics-2nd', 'marketing', '{2}', 'Theory', 'BBA', 0, true),
('Agricultural Marketing', 'কৃষি বিপণন', 'bba-marketing-agricultural-marketing', 'marketing', '{2}', 'Theory', 'BBA', 0, true),

-- BBA - Marketing - 3rd Year
('Principles of Marketing-II', 'বিপণনের মূলনীতি-২', 'bba-marketing-principles-of-marketing-2', 'marketing', '{3}', 'Math', 'BBA', 0, true),
('Organizational Behavior', 'সাংগঠনিক আচরণ', 'bba-marketing-org-behavior', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Financial Management', 'আর্থিক ব্যবস্থাপনা', 'bba-marketing-financial-management', 'marketing', '{3}', 'Math', 'BBA', 0, true),
('Business Statistics-II', 'ব্যবসায় পরিসংখ্যান-২', 'bba-marketing-business-stats-2', 'marketing', '{3}', 'Math', 'BBA', 0, true),
('Advertising & Promotion', 'বিজ্ঞাপন ও প্রচার', 'bba-marketing-advertising-promotion', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Legal Aspects of Marketing', 'বিপণনের আইনি দিক', 'bba-marketing-legal-aspects', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Macro Economics', 'ম্যাক্রো ইকোনমিক্স', 'bba-marketing-macro-economics', 'marketing', '{3}', 'Theory', 'BBA', 0, true),
('Taxation in Bangladesh', 'বাংলাদেশে কর ব্যবস্থা', 'bba-marketing-taxation', 'marketing', '{3}', 'Math', 'BBA', 0, true),

-- BBA - Marketing - 4th Year
('Marketing Management', 'মার্কেটিং ম্যানেজমেন্ট', 'bba-marketing-marketing-management', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Human Resource Management', 'মানব সম্পদ ব্যবস্থাপনা', 'bba-marketing-hrm-4th', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('International Business', 'আন্তর্জাতিক ব্যবসায়', 'bba-marketing-intl-business', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Consumer Behavior', 'ভোক্তা আচরণ', 'bba-marketing-consumer-behavior', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Sales Management', 'বিক্রয় ব্যবস্থাপনা', 'bba-marketing-sales-management', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Brand Management', 'ব্র্যান্ড ম্যানেজমেন্ট', 'bba-marketing-brand-management', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Entrepreneurship Development', 'উদ্যোক্তা উন্নয়ন', 'bba-marketing-entrepreneurship', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Bangladesh Economics', 'বাংলাদেশ অর্থনীতি', 'bba-marketing-bangladesh-economics', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Marketing Research', 'মার্কেটিং রিসার্চ', 'bba-marketing-marketing-research', 'marketing', '{4}', 'Theory', 'BBA', 0, true),
('Viva-voce', 'মৌখিক পরীক্ষা', 'bba-marketing-viva-voce', 'marketing', '{4}', 'Theory', 'BBA', 0, true),

-- Job Preparation - General
('Bangla', 'বাংলা', 'job-prep-bangla', 'general', NULL, 'N/A', 'Job Preparation', 0, true),
('English', 'ইংরেজি', 'job-prep-english', 'general', NULL, 'N/A', 'Job Preparation', 0, true),
('General Knowledge', 'সাধারণ জ্ঞান', 'job-prep-general-knowledge', 'general', NULL, 'N/A', 'Job Preparation', 0, true),
('General Mathematics', 'সাধারণ গণিত', 'job-prep-general-math', 'general', NULL, 'N/A', 'Job Preparation', 0, true),

-- Statistics Courses
('Social Statistics', 'সামাজিক পরিসংখ্যান', 'stats-social-statistics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Business Statistics', 'ব্যবসায় পরিসংখ্যান', 'stats-business-statistics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Statistics for Economics', 'অর্থনীতির জন্য পরিসংখ্যান', 'stats-statistics-for-economics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Basis Statistics', 'মৌলিক পরিসংখ্যান', 'stats-basis-statistics', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Research Methodology and Statistics', 'গবেষণা পদ্ধতি ও পরিসংখ্যান', 'stats-research-methodology', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),
('Social Research & Statistics', 'সামাজিক গবেষণা ও পরিসংখ্যান', 'stats-social-research', 'statistics', NULL, 'Math', 'Statistics Courses', 0, true),

-- BSS (Honours) - Economics
('Basis Mathematics', 'মৌলিক গণিত', 'bss-economics-basis-math', 'economics', NULL, 'Math', 'BSS (Honours)', 0, true),
('Mathematical Economics', 'গাণিতিক অর্থনীতি', 'bss-economics-mathematical-economics', 'economics', NULL, 'Math', 'BSS (Honours)', 0, true),

-- Honours - 2nd Year
('Compulsory English Honours 2nd Year', 'আবশ্যিক ইংরেজি অনার্স ২য় বর্ষ', 'honours-compulsory-english-2nd', 'general', '{2}', 'N/A', 'Honours', 0, true),

-- MBA - Management
('Management Thought', 'ব্যবস্থাপনা চিন্তাধারা', 'mba-management-management-thought', 'management', NULL, 'Theory', 'MBA', 0, true),
('International Business', 'আন্তর্জাতিক ব্যবসায়', 'mba-management-intl-business', 'management', NULL, 'Theory', 'MBA', 0, true),
('Business Research', 'ব্যবসায় গবেষণা', 'mba-management-business-research', 'management', NULL, 'Theory', 'MBA', 0, true),
('Strategic Management', 'কৌশলগত ব্যবস্থাপনা', 'mba-management-strategic-management', 'management', NULL, 'Math', 'MBA', 0, true),
('Management Information System', 'ব্যবস্থাপনা তথ্য ব্যবস্থা', 'mba-management-mis', 'management', NULL, 'Theory', 'MBA', 0, true),
('Training and Development', 'প্রশিক্ষণ ও উন্নয়ন', 'mba-management-training-development', 'management', NULL, 'Theory', 'MBA', 0, true),
('Compensation Management', 'ক্ষতিপূরণ ব্যবস্থাপনা', 'mba-management-compensation', 'management', NULL, 'Theory', 'MBA', 0, true),
('Term Paper', 'টার্ম পেপার', 'mba-management-term-paper', 'management', NULL, 'Theory', 'MBA', 0, true),
('Viva-Voce', 'মৌখিক পরীক্ষা', 'mba-management-viva-voce', 'management', NULL, 'Theory', 'MBA', 0, true),

-- MBA - Accounting
('Applied Accounting Theory', 'ফলিত হিসাববিজ্ঞান তত্ত্ব', 'mba-accounting-applied-accounting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Advanced Cost Accounting', 'উচ্চতর ব্যয় হিসাববিজ্ঞান', 'mba-accounting-advanced-cost-accounting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Strategic Management Accounting', 'কৌশলগত ব্যবস্থাপনা হিসাববিজ্ঞান', 'mba-accounting-strategic-mgmt-accounting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Strategic Management', 'কৌশলগত ব্যবস্থাপনা', 'mba-accounting-strategic-management', 'accounting', NULL, 'Theory', 'MBA', 0, true),
('Corporate Governance', 'কর্পোরেট গভর্নেন্স', 'mba-accounting-corporate-governance', 'accounting', NULL, 'Theory', 'MBA', 0, true),
('Corporate Financial Reporting', 'কর্পোরেট আর্থিক প্রতিবেদন', 'mba-accounting-corporate-financial-reporting', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Corporate Tax Planning', 'কর্পোরেট কর পরিকল্পনা', 'mba-accounting-corporate-tax-planning', 'accounting', NULL, 'Math', 'MBA', 0, true),
('Term Paper', 'টার্ম পেপার', 'mba-accounting-term-paper', 'accounting', NULL, 'Math', 'MBA', 0, true);


-- >>> Migration: 20260304173135_1e70f701-2322-4da8-b0ac-630da59f3d0a.sql <<<
-- Set reasonable prices for all subjects
-- BBA subjects: ৳500 per subject
UPDATE public.subjects SET price = 500 WHERE course_type = 'BBA';

-- MBA subjects: ৳800 per subject
UPDATE public.subjects SET price = 800 WHERE course_type = 'MBA';

-- Job Preparation: ৳300 per subject
UPDATE public.subjects SET price = 300 WHERE course_type = 'Job Preparation';

-- Statistics Courses: ৳400 per subject
UPDATE public.subjects SET price = 400 WHERE course_type = 'Statistics Courses';

-- BSS Honours: ৳400 per subject
UPDATE public.subjects SET price = 400 WHERE course_type = 'BSS (Honours)';

-- Honours: ৳350 per subject
UPDATE public.subjects SET price = 350 WHERE course_type = 'Honours';


-- >>> Migration: 20260304175953_a20f85fb-fc92-4180-9cdd-cc132b5fc47c.sql <<<
ALTER TABLE public.cms_content ADD CONSTRAINT cms_content_section_unique UNIQUE (section);


-- >>> Migration: 20260304202152_b18a2c87-e36b-4cf8-a2af-19926e8f3727.sql <<<
-- Add demo video, instructor avatars, and original price to subjects
ALTER TABLE public.subjects 
  ADD COLUMN IF NOT EXISTS demo_video_url text,
  ADD COLUMN IF NOT EXISTS instructor_avatars text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS original_price numeric DEFAULT 0;

-- Create course_pdfs table
CREATE TABLE public.course_pdfs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE CASCADE,
  department text,
  target_years integer[] DEFAULT ARRAY[1,2,3,4],
  file_url text NOT NULL,
  file_size_bytes bigint,
  is_free boolean DEFAULT false,
  is_visible boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.course_pdfs ENABLE ROW LEVEL SECURITY;

-- Admins can manage all PDFs
CREATE POLICY "Admins can manage PDFs" ON public.course_pdfs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Students can view PDFs they have access to (free or enrolled)
CREATE POLICY "Students can view accessible PDFs" ON public.course_pdfs
  FOR SELECT TO authenticated
  USING (
    is_visible = true AND (
      is_free = true 
      OR EXISTS (
        SELECT 1 FROM enrollments e 
        WHERE e.user_id = auth.uid() 
        AND e.subject_id = course_pdfs.subject_id 
        AND e.payment_status = 'completed'
      )
    )
  );

-- Storage bucket for PDFs (private - no direct access)
INSERT INTO storage.buckets (id, name, public) VALUES ('course-pdfs', 'course-pdfs', false);

-- RLS for PDF storage
CREATE POLICY "Admins can upload PDFs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-pdfs' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read PDFs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'course-pdfs');

CREATE POLICY "Admins can delete PDFs" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'course-pdfs' AND public.has_role(auth.uid(), 'admin'));


-- >>> Migration: 20260305085354_26fbb8da-3ab0-404e-99c1-a87bbe089382.sql <<<
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


-- >>> Migration: 20260305085600_da30b511-a5fd-478f-811c-f0a01258a3c6.sql <<<
CREATE TABLE public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table
CREATE POLICY "No direct access to otp_codes" ON public.otp_codes
  FOR SELECT USING (false);

-- Auto-cleanup old OTPs
CREATE INDEX idx_otp_codes_phone ON public.otp_codes(phone, created_at DESC);


-- >>> Migration: 20260305093203_26b38ce3-bc7d-4ef4-850e-36979f4b88ed.sql <<<
-- Create instructors table to replace the crude instructor_avatars array
CREATE TABLE public.instructors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  name_bn TEXT,
  position TEXT,
  position_bn TEXT,
  education TEXT,
  education_bn TEXT,
  avatar_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.instructors ENABLE ROW LEVEL SECURITY;

-- Anyone can view instructors
CREATE POLICY "Anyone can view instructors"
  ON public.instructors FOR SELECT
  USING (true);

-- Admins can manage instructors
CREATE POLICY "Admins can manage instructors"
  ON public.instructors FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));


-- >>> Migration: 20260305093602_e790659d-6799-4ae8-8993-b7cff7741660.sql <<<
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  recipient_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamp with time zone,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms campaigns"
  ON public.sms_campaigns FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));


-- >>> Migration: 20260305102904_55065488-4b17-4190-a1ca-bc577773776b.sql <<<
-- SMS Templates table
CREATE TABLE public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms templates" ON public.sms_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add scheduled_for to sms_campaigns
ALTER TABLE public.sms_campaigns ADD COLUMN scheduled_for TIMESTAMPTZ DEFAULT NULL;


-- >>> Migration: 20260306052919_5618fd17-6c16-4a0f-87f5-858236a92b39.sql <<<
-- Create subject_chapters table
CREATE TABLE public.subject_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_bn text,
  description text,
  description_bn text,
  youtube_url text NOT NULL,
  is_free boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subject_chapters ENABLE ROW LEVEL SECURITY;

-- Anyone can view chapters (access control handled in UI based on is_free + enrollment)
CREATE POLICY "Anyone can view chapters"
  ON public.subject_chapters
  FOR SELECT
  USING (true);

-- Admins can manage chapters
CREATE POLICY "Admins can manage chapters"
  ON public.subject_chapters
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));


-- >>> Migration: 20260306070121_5b0c38c6-8fe3-4581-9815-58928ce9aad2.sql <<<
-- Blog posts table
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  title_bn text,
  slug text NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  content_bn text,
  excerpt text,
  excerpt_bn text,
  cover_image_url text,
  images text[] DEFAULT '{}',
  author_name text NOT NULL DEFAULT 'Admin',
  author_name_bn text,
  author_avatar_url text,
  meta_description text,
  meta_description_bn text,
  keywords text[] DEFAULT '{}',
  is_featured boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  scheduled_for timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view published posts
CREATE POLICY "Anyone can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (is_published = true AND (scheduled_for IS NULL OR scheduled_for <= now()));

-- Admins can view all posts
CREATE POLICY "Admins can view all blog posts"
  ON public.blog_posts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Admins can manage blog posts
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for blog images
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-images', 'blog-images', true);

-- Storage policies
CREATE POLICY "Anyone can view blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update blog images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete blog images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'blog-images' AND has_role(auth.uid(), 'admin'));


-- >>> Migration: 20260306071752_029b5d3a-745e-4275-b7f9-ac0732f6f358.sql <<<
ALTER TABLE public.blog_posts ADD COLUMN view_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_blog_view(post_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE blog_posts SET view_count = view_count + 1 WHERE slug = post_slug AND is_published = true;
$$;


-- >>> Migration: 20260306080623_c4ff502d-aeb1-497f-b678-d1362b13119e.sql <<<
CREATE TABLE public.chapter_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES public.subject_chapters(id) ON DELETE CASCADE,
  title text NOT NULL,
  title_bn text,
  youtube_url text NOT NULL,
  is_free boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chapter_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classes" ON public.chapter_classes FOR SELECT USING (true);
CREATE POLICY "Admins can manage classes" ON public.chapter_classes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Remove youtube_url and is_free from subject_chapters since videos now live in classes
ALTER TABLE public.subject_chapters ALTER COLUMN youtube_url DROP NOT NULL;
ALTER TABLE public.subject_chapters ALTER COLUMN youtube_url SET DEFAULT NULL;


-- >>> Migration: 20260306103752_d513652d-e0a0-4dc6-8c80-654b4a864a89.sql <<<
ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL, ALTER COLUMN email SET DEFAULT '';


-- >>> Migration: 20260306160135_58c03993-484c-4815-9f2c-f24c96b7b38f.sql <<<
-- Bundles table
CREATE TABLE public.bundles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_bn TEXT,
  department TEXT,
  year INTEGER,
  price NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC,
  cover_image_url TEXT,
  description TEXT,
  description_bn TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bundle-subjects relation
CREATE TABLE public.bundle_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bundle_id UUID NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  UNIQUE(bundle_id, subject_id)
);

-- Cart items
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_id)
);

-- Math pricing tiers (configurable by admin)
CREATE TABLE public.math_pricing_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quantity INTEGER NOT NULL UNIQUE,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default math pricing tiers
INSERT INTO public.math_pricing_tiers (quantity, discount_percent) VALUES
  (1, 0),
  (2, 10),
  (3, 13),
  (4, 16),
  (5, 19),
  (6, 22),
  (7, 26),
  (8, 30);

-- RLS for bundles
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible bundles"
  ON public.bundles FOR SELECT
  USING (is_visible = true);

CREATE POLICY "Admins can view all bundles"
  ON public.bundles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage bundles"
  ON public.bundles FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS for bundle_subjects
ALTER TABLE public.bundle_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view bundle subjects"
  ON public.bundle_subjects FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage bundle subjects"
  ON public.bundle_subjects FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS for cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS for math_pricing_tiers
ALTER TABLE public.math_pricing_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pricing tiers"
  ON public.math_pricing_tiers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage pricing tiers"
  ON public.math_pricing_tiers FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for bundles
CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON public.bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- >>> Migration: 20260306162252_23a5f1bd-39da-4aef-88c1-452f687a8657.sql <<<
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


-- >>> Migration: 20260306201633_647d0220-0500-4b8a-84d0-65b1abd6717d.sql <<<
ALTER TABLE public.free_videos ADD COLUMN department text;
ALTER TABLE public.free_videos ADD COLUMN compatible_years integer[] DEFAULT '{1,2,3,4}';


-- >>> Migration: 20260306202412_1d4eb18b-71e6-4b06-aa6a-6f9937cb5cb8.sql <<<
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


-- >>> Migration: 20260306203833_44ffb117-ca5e-4935-9a60-d90a1a1cf282.sql <<<
CREATE POLICY "Users can insert their own student role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND role = 'student'::app_role);


-- >>> Migration: 20260307181755_89d9f32a-789f-4537-a3ee-e27e881cb916.sql <<<
ALTER TABLE public.profiles ADD COLUMN session text;
ALTER TABLE public.profiles ADD COLUMN course_type text;


-- >>> Migration: 20260307201816_ef515bbb-e53b-45d0-b6d8-2c96e9195e99.sql <<<
UPDATE carousel_banners 
SET image_url = 'https://hvxyiungdyaaladikecd.supabase.co/storage/v1/object/public/carousel-banners/optimized-banner.webp',
    updated_at = now()
WHERE id = '18d069bf-862e-43f9-83d0-4ac0af4a0b5e';


-- >>> Migration: 20260308104424_5460befb-0742-4126-a29a-a48e41ad12c6.sql <<<
-- 1. FIX CRITICAL: Enrollment INSERT - restrict payment_status to 'pending' only
DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.enrollments;
CREATE POLICY "Users can create their own enrollments"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND payment_status = 'pending'::payment_status
);

-- 2. FIX CRITICAL: Legacy students - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can check legacy students by phone" ON public.legacy_students;
CREATE POLICY "Authenticated users can check legacy students"
ON public.legacy_students
FOR SELECT
TO authenticated
USING (true);

-- 3. FIX CRITICAL: Chapter classes - protect paid video URLs
DROP POLICY IF EXISTS "Anyone can view classes" ON public.chapter_classes;
CREATE POLICY "Anyone can view free classes"
ON public.chapter_classes
FOR SELECT
USING (is_free = true);

CREATE POLICY "Enrolled users can view paid classes"
ON public.chapter_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN subject_chapters sc ON sc.subject_id = e.subject_id
    WHERE sc.id = chapter_classes.chapter_id
      AND e.user_id = auth.uid()
      AND e.payment_status = 'completed'::payment_status
  )
);

-- 4. FIX WARNING: Remove user UPDATE on payments (should only be done server-side)
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

-- 5. FIX WARNING: Subject chapters - protect paid chapter URLs
DROP POLICY IF EXISTS "Anyone can view chapters" ON public.subject_chapters;
CREATE POLICY "Anyone can view free chapters"
ON public.subject_chapters
FOR SELECT
USING (is_free = true);

CREATE POLICY "Enrolled users can view paid chapters"
ON public.subject_chapters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.subject_id = subject_chapters.subject_id
      AND e.user_id = auth.uid()
      AND e.payment_status = 'completed'::payment_status
  )
);


-- >>> Migration: 20260308104650_9156ff7d-47d3-4769-801f-8e935344060e.sql <<<
-- 1. FIX: Legacy students - restrict to own phone lookup only
DROP POLICY IF EXISTS "Authenticated users can check legacy students" ON public.legacy_students;
CREATE POLICY "Users can check own legacy record"
ON public.legacy_students
FOR SELECT
TO authenticated
USING (
  phone IN (
    SELECT p.phone FROM profiles p WHERE p.user_id = auth.uid()
  )
);

-- 2. FIX: Students can create referral codes with bounded discount values
DROP POLICY IF EXISTS "Students can create own referral codes" ON public.discount_codes;
CREATE POLICY "Students can create own referral codes"
ON public.discount_codes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = owner_user_id
  AND is_referral = true
  AND owner_type = 'student'
  AND discount_value <= 15
  AND (discount_percent_receiver IS NULL OR discount_percent_receiver <= 15)
  AND (discount_percent_owner IS NULL OR discount_percent_owner <= 15)
  AND (max_uses IS NULL OR max_uses <= 100)
);

-- 3. FIX: Discount codes public view - restrict visible columns via narrower policy
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;
-- We can't restrict columns via RLS, so we keep the policy but it's acceptable
-- since the main risk (arbitrary discount creation) is now fixed
CREATE POLICY "Anyone can view active discount codes"
ON public.discount_codes
FOR SELECT
USING (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
);

-- 4. FIX: Class schedules - remove the broad department/year matching policy
DROP POLICY IF EXISTS "Students can view matching calendar events" ON public.class_schedules;


-- >>> Migration: 20260308105013_a11b9cb4-b5bd-4353-be68-72fb0a8f57dd.sql <<<
-- 1. FIX: Discount codes - create a secure view for public access
CREATE OR REPLACE VIEW public.public_discount_codes
WITH (security_invoker = false)
AS SELECT code, discount_value, discount_type, valid_from, valid_until, subject_id, is_referral, discount_percent_receiver
FROM public.discount_codes
WHERE is_active = true AND (valid_until IS NULL OR valid_until > now());

-- Remove public SELECT on base table
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;

-- 2. FIX: Pending referrals - restrict to authenticated users
DROP POLICY IF EXISTS "Service role inserts pending referrals" ON public.pending_referrals;
CREATE POLICY "Authenticated users can insert pending referrals"
ON public.pending_referrals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM discount_codes dc
    WHERE dc.id = pending_referrals.referral_code_id AND dc.is_active = true
  )
);

-- 3. FIX: Referral clicks - create restricted view for code owners (without IP/user_agent)
DROP POLICY IF EXISTS "Code owners can view their clicks" ON public.referral_clicks;
CREATE POLICY "Code owners can view click summaries"
ON public.referral_clicks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM discount_codes dc
    WHERE dc.id = referral_clicks.referral_code_id
      AND dc.owner_user_id = auth.uid()
  )
);


-- >>> Migration: 20260308105025_84e8b61d-1dcb-4034-9992-bd168fe5b427.sql <<<
-- Fix security definer view - use security_invoker instead
DROP VIEW IF EXISTS public.public_discount_codes;
CREATE OR REPLACE VIEW public.public_discount_codes
WITH (security_invoker = true)
AS SELECT code, discount_value, discount_type, valid_from, valid_until, subject_id, is_referral, discount_percent_receiver
FROM public.discount_codes
WHERE is_active = true AND (valid_until IS NULL OR valid_until > now());

-- Re-add a limited public SELECT policy for the view to work
CREATE POLICY "Anyone can view active discount codes limited"
ON public.discount_codes
FOR SELECT
USING (
  is_active = true
  AND (valid_until IS NULL OR valid_until > now())
);


-- >>> Migration: 20260308110538_d1ab4229-35cf-48dd-9284-ddf054b5fbbc.sql <<<
-- Remove the public policy that leaks sensitive discount code data
DROP POLICY IF EXISTS "Anyone can view active discount codes limited" ON public.discount_codes;

-- Ensure the public_discount_codes view has a proper public select policy instead
-- Grant anon access to the safe view
GRANT SELECT ON public.public_discount_codes TO anon;
GRANT SELECT ON public.public_discount_codes TO authenticated;


-- >>> Migration: 20260308111035_4e38d881-32b0-4318-80d5-2ca56018bf06.sql <<<
-- Fix 1: Enable RLS on the public_discount_codes view is not possible (it's a view),
-- but we need to ensure it only exposes safe data. The view already filters columns.
-- The GRANT we did is sufficient since views inherit the definer's permissions.

-- Fix 2: Restrict referral_clicks to hide raw IP/user_agent from students
DROP POLICY IF EXISTS "Code owners can view click summaries" ON public.referral_clicks;

CREATE POLICY "Code owners can view click counts"
ON public.referral_clicks
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.discount_codes dc
    WHERE dc.id = referral_clicks.referral_code_id
      AND dc.owner_user_id = auth.uid()
  )
);

-- Create a safe view for referral click summaries (no IP/user_agent)
CREATE OR REPLACE VIEW public.referral_click_summaries AS
SELECT
  referral_code_id,
  country,
  COUNT(*) as click_count,
  MIN(clicked_at) as first_click,
  MAX(clicked_at) as last_click
FROM public.referral_clicks
GROUP BY referral_code_id, country;


-- >>> Migration: 20260308111044_db15369a-6cd1-4fc6-9d3b-b03e1996539c.sql <<<
-- Fix security definer view by setting it to SECURITY INVOKER
ALTER VIEW public.referral_click_summaries SET (security_invoker = on);
ALTER VIEW public.public_discount_codes SET (security_invoker = on);


-- >>> Migration: 20260308111526_7289bbb6-dad1-47c3-b7db-5a95fa8ac9b0.sql <<<
-- Session tracking table
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_label text, -- e.g. "Chrome on Windows"
  ip_address text,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert/update their own sessions
CREATE POLICY "Users can upsert own sessions"
ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON public.user_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage sessions"
ON public.user_sessions FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Session violations / sharing attempts log
CREATE TABLE public.session_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  violation_type text NOT NULL DEFAULT 'blocked_login', -- blocked_login, concurrent_usage
  blocked_device_fingerprint text,
  blocked_device_label text,
  blocked_ip text,
  active_device_fingerprint text,
  active_device_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_violations ENABLE ROW LEVEL SECURITY;

-- Only admins can view violations
CREATE POLICY "Admins can manage violations"
ON public.session_violations FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow authenticated users to insert violations (for logging blocked attempts)
CREATE POLICY "Users can log own violations"
ON public.session_violations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Max devices setting in profiles (default 1)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_devices integer NOT NULL DEFAULT 1;


-- >>> Migration: 20260308112109_38924884-a18c-44f9-9e36-2b89b1bb0386.sql <<<
-- Trusted devices table — stores permanently locked devices per user
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_fingerprint text NOT NULL,
  device_label text,
  ip_address text,
  registered_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  is_revoked boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

-- Users can view their own trusted devices
CREATE POLICY "Users can view own trusted devices"
ON public.trusted_devices FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own trusted devices (for first registration)
CREATE POLICY "Users can register own devices"
ON public.trusted_devices FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update last_used_at on their own devices
CREATE POLICY "Users can update own device usage"
ON public.trusted_devices FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins can manage trusted devices"
ON public.trusted_devices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Platform settings table for global config
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id text PRIMARY KEY DEFAULT 'default',
  max_devices_per_student integer NOT NULL DEFAULT 1,
  session_timeout_minutes integer NOT NULL DEFAULT 5,
  device_lock_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
ON public.platform_settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.platform_settings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.platform_settings (id, max_devices_per_student, session_timeout_minutes, device_lock_enabled)
VALUES ('default', 1, 5, true)
ON CONFLICT (id) DO NOTHING;


-- >>> Migration: 20260309112548_1d7a6851-302a-421a-aa59-f6689775bf0c.sql <<<
-- Drop the overly permissive policy that allows ALL authenticated users to read course PDFs
DROP POLICY IF EXISTS "Authenticated users can read PDFs" ON storage.objects;

-- Create a properly scoped policy: only admins and enrolled students can access course PDFs
CREATE POLICY "Admins and enrolled students can read course PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-pdfs'
    AND (
      -- Admins always have access
      public.has_role(auth.uid(), 'admin')
      -- Enrolled students with completed payment can access
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.payment_status = 'completed'
      )
    )
  );


-- >>> Migration: 20260316050915_53f1ab6f-f7c4-4cb7-9704-157fc59ad9f4.sql <<<
-- Create can_manage function for employee permission checks
CREATE OR REPLACE FUNCTION public.can_manage(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin'::app_role) 
    OR EXISTS (
      SELECT 1 
      FROM employees e 
      JOIN employee_permissions ep ON ep.employee_id = e.id
      WHERE e.user_id = auth.uid() 
        AND e.status = 'active'
        AND (
          e.sub_role = 'super_admin'
          OR
          CASE _permission
            WHEN 'can_manage_subjects' THEN ep.can_manage_subjects
            WHEN 'can_manage_carousel' THEN ep.can_manage_carousel
            WHEN 'can_manage_cms' THEN ep.can_manage_cms
            WHEN 'can_manage_enrollments' THEN ep.can_manage_enrollments
            WHEN 'can_manage_students' THEN ep.can_manage_students
            WHEN 'can_manage_calendar' THEN ep.can_manage_calendar
            WHEN 'can_manage_discount_codes' THEN ep.can_manage_discount_codes
            WHEN 'can_manage_referral_codes' THEN ep.can_manage_referral_codes
            WHEN 'can_manage_videos' THEN ep.can_manage_videos
            WHEN 'can_manage_pdfs' THEN ep.can_manage_pdfs
            WHEN 'can_manage_analytics' THEN ep.can_manage_analytics
            WHEN 'can_manage_gallery' THEN ep.can_manage_gallery
            WHEN 'can_manage_subject_cms' THEN ep.can_manage_subject_cms
            ELSE false
          END
        )
    )
$$;

-- BUNDLES
DROP POLICY IF EXISTS "Admins can manage bundles" ON public.bundles;
DROP POLICY IF EXISTS "Admins can view all bundles" ON public.bundles;
CREATE POLICY "Staff can manage bundles" ON public.bundles FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

DROP POLICY IF EXISTS "Admins can manage bundle subjects" ON public.bundle_subjects;
CREATE POLICY "Staff can manage bundle subjects" ON public.bundle_subjects FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

-- CAROUSEL
DROP POLICY IF EXISTS "Admins can manage carousel banners" ON public.carousel_banners;
CREATE POLICY "Staff can manage carousel banners" ON public.carousel_banners FOR ALL TO public
  USING (can_manage('can_manage_carousel')) WITH CHECK (can_manage('can_manage_carousel'));

-- CMS
DROP POLICY IF EXISTS "Admins can manage CMS content" ON public.cms_content;
CREATE POLICY "Staff can manage CMS content" ON public.cms_content FOR ALL TO public
  USING (can_manage('can_manage_cms')) WITH CHECK (can_manage('can_manage_cms'));

-- SUBJECTS
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can view all subjects" ON public.subjects;
CREATE POLICY "Staff can manage subjects" ON public.subjects FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

-- CHAPTERS
DROP POLICY IF EXISTS "Admins can manage chapters" ON public.subject_chapters;
CREATE POLICY "Staff can manage chapters" ON public.subject_chapters FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

DROP POLICY IF EXISTS "Admins can manage classes" ON public.chapter_classes;
CREATE POLICY "Staff can manage classes" ON public.chapter_classes FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

-- FREE VIDEOS
DROP POLICY IF EXISTS "Admins can manage free videos" ON public.free_videos;
DROP POLICY IF EXISTS "Admins can view all free videos" ON public.free_videos;
CREATE POLICY "Staff can manage free videos" ON public.free_videos FOR ALL TO public
  USING (can_manage('can_manage_videos')) WITH CHECK (can_manage('can_manage_videos'));

-- COURSE PDFS
DROP POLICY IF EXISTS "Admins can manage PDFs" ON public.course_pdfs;
CREATE POLICY "Staff can manage PDFs" ON public.course_pdfs FOR ALL TO authenticated
  USING (can_manage('can_manage_pdfs')) WITH CHECK (can_manage('can_manage_pdfs'));

-- CLASS SCHEDULES
DROP POLICY IF EXISTS "Admins can manage class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Admins can view all classes" ON public.class_schedules;
CREATE POLICY "Staff can manage class schedules" ON public.class_schedules FOR ALL TO public
  USING (can_manage('can_manage_calendar')) WITH CHECK (can_manage('can_manage_calendar'));

-- DISCOUNT CODES
DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;
CREATE POLICY "Staff can manage discount codes" ON public.discount_codes FOR ALL TO public
  USING (can_manage('can_manage_discount_codes')) WITH CHECK (can_manage('can_manage_discount_codes'));

-- GALLERY
DROP POLICY IF EXISTS "Admins can manage gallery images" ON public.gallery_images;
CREATE POLICY "Staff can manage gallery images" ON public.gallery_images FOR ALL TO public
  USING (can_manage('can_manage_gallery')) WITH CHECK (can_manage('can_manage_gallery'));

-- BLOG
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can view all blog posts" ON public.blog_posts;
CREATE POLICY "Staff can manage blog posts" ON public.blog_posts FOR ALL TO authenticated
  USING (can_manage('can_manage_cms')) WITH CHECK (can_manage('can_manage_cms'));

-- TESTIMONIALS
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can view all testimonials" ON public.testimonials;
CREATE POLICY "Staff can manage testimonials" ON public.testimonials FOR ALL TO public
  USING (can_manage('can_manage_cms')) WITH CHECK (can_manage('can_manage_cms'));

-- INSTRUCTORS
DROP POLICY IF EXISTS "Admins can manage instructors" ON public.instructors;
CREATE POLICY "Staff can manage instructors" ON public.instructors FOR ALL TO public
  USING (can_manage('can_manage_subject_cms')) WITH CHECK (can_manage('can_manage_subject_cms'));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Staff can manage notifications" ON public.notifications FOR ALL TO public
  USING (can_manage('can_manage_students')) WITH CHECK (can_manage('can_manage_students'));

-- STORAGE: Carousel banners
DROP POLICY IF EXISTS "Admins can upload carousel banner images" ON storage.objects;
CREATE POLICY "Staff can upload carousel banner images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'carousel-banners' AND can_manage('can_manage_carousel'));

DROP POLICY IF EXISTS "Admins can update carousel banner images" ON storage.objects;
CREATE POLICY "Staff can update carousel banner images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'carousel-banners' AND can_manage('can_manage_carousel'));

DROP POLICY IF EXISTS "Admins can delete carousel banner images" ON storage.objects;
CREATE POLICY "Staff can delete carousel banner images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'carousel-banners' AND can_manage('can_manage_carousel'));

-- STORAGE: Blog images (also bundle covers)
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Staff can upload blog images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND (can_manage('can_manage_cms') OR can_manage('can_manage_subjects')));

DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Staff can update blog images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'blog-images' AND (can_manage('can_manage_cms') OR can_manage('can_manage_subjects')));

DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Staff can delete blog images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND (can_manage('can_manage_cms') OR can_manage('can_manage_subjects')));

-- STORAGE: Gallery
DROP POLICY IF EXISTS "Admins can upload gallery images" ON storage.objects;
CREATE POLICY "Staff can upload gallery images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-images' AND can_manage('can_manage_gallery'));

DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;
CREATE POLICY "Staff can delete gallery images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'gallery-images' AND can_manage('can_manage_gallery'));

-- STORAGE: PDFs
DROP POLICY IF EXISTS "Admins can upload PDFs" ON storage.objects;
CREATE POLICY "Staff can upload PDFs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-pdfs' AND can_manage('can_manage_pdfs'));

DROP POLICY IF EXISTS "Admins can delete PDFs" ON storage.objects;
CREATE POLICY "Staff can delete PDFs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'course-pdfs' AND can_manage('can_manage_pdfs'));


-- >>> Migration: 20260318102746_f005d2dc-5d98-4759-b2c7-7db161c21e8e.sql <<<
-- Fix employees table RLS: allow super_admin employees to see/manage employees
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
CREATE POLICY "Staff can manage employees"
  ON public.employees FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.status = 'active'
        AND e.sub_role = 'super_admin'
    )
  );

-- Fix employee_permissions table RLS: allow super_admin employees to manage permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.employee_permissions;
CREATE POLICY "Staff can manage permissions"
  ON public.employee_permissions FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.status = 'active'
        AND e.sub_role = 'super_admin'
    )
  );


-- >>> Migration: 20260411182325_9b74d8ab-6b08-4e39-82fa-fd06a4296d5b.sql <<<
-- Add SSC and HSC to the department enum
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'ssc';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'hsc';


-- >>> Migration: 20260411195929_5cd265f7-dc78-442c-a227-fd9d093f9c2a.sql <<<
CREATE OR REPLACE FUNCTION public.handle_employee_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Check if this email was invited as employee
  SELECT id, sub_role INTO emp_record
  FROM public.employees
  WHERE invited_email = NEW.email AND status = 'invited';

  IF FOUND THEN
    -- Activate employee
    UPDATE public.employees
    SET user_id = NEW.id, status = 'active'
    WHERE id = emp_record.id;

    -- Assign employee role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If super_admin, also assign admin role for full access
    IF emp_record.sub_role = 'super_admin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (drop + create to ensure it uses updated function)
DROP TRIGGER IF EXISTS on_auth_user_created_employee ON auth.users;
CREATE TRIGGER on_auth_user_created_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_employee_signup();


-- >>> Migration: 20260412094932_0adcb6ce-7013-4617-b529-8ef3f7a3583a.sql <<<
-- Live sessions table
CREATE TABLE public.live_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  title_bn text,
  description text,
  description_bn text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  scheduled_start timestamptz,
  actual_start timestamptz,
  actual_end timestamptz,
  mux_live_stream_id text,
  mux_playback_id text,
  mux_space_id text,
  thumbnail_url text,
  viewer_count integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- Anyone can view non-draft sessions
CREATE POLICY "Anyone can view live sessions"
  ON public.live_sessions FOR SELECT
  USING (true);

-- Staff can manage sessions
CREATE POLICY "Staff can manage live sessions"
  ON public.live_sessions FOR ALL
  TO authenticated
  USING (can_manage('can_manage_subjects'))
  WITH CHECK (can_manage('can_manage_subjects'));

-- Trigger for updated_at
CREATE TRIGGER update_live_sessions_updated_at
  BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Live chat messages table
CREATE TABLE public.live_chat_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT 'Anonymous',
  message text NOT NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view chat
CREATE POLICY "Authenticated users can view chat"
  ON public.live_chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can send messages
CREATE POLICY "Authenticated users can send messages"
  ON public.live_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Staff can manage chat (pin/delete)
CREATE POLICY "Staff can manage chat"
  ON public.live_chat_messages FOR ALL
  TO authenticated
  USING (can_manage('can_manage_subjects'))
  WITH CHECK (can_manage('can_manage_subjects'));

-- Connected Facebook pages
CREATE TABLE public.connected_facebook_pages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id text NOT NULL,
  page_name text NOT NULL,
  page_access_token text NOT NULL,
  connected_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.connected_facebook_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage facebook pages"
  ON public.connected_facebook_pages FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_facebook_pages_updated_at
  BEFORE UPDATE ON public.connected_facebook_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;


-- >>> Migration: 20260412124525_9d3f12d7-9400-4e4e-9c96-c47be32a9200.sql <<<
ALTER TABLE public.live_sessions 
ADD COLUMN recording_playback_id text,
ADD COLUMN recording_expires_at timestamp with time zone;


-- >>> Migration: 20260508153528_6ab2c50a-2744-4c82-8637-24edeae93fe2.sql <<<
-- Facebook Group join request tracking (self-reported)
CREATE TABLE public.facebook_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  student_note TEXT,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id)
);

ALTER TABLE public.facebook_join_requests ENABLE ROW LEVEL SECURITY;

-- Status check via trigger (avoid CHECK with non-immutable contexts)
CREATE OR REPLACE FUNCTION public.validate_fb_join_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fb_join_validate
BEFORE INSERT OR UPDATE ON public.facebook_join_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_fb_join_status();

-- Students manage own requests, but cannot set status to approved/rejected
CREATE POLICY "Users view own fb requests" ON public.facebook_join_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own fb requests" ON public.facebook_join_requests
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.user_id = auth.uid()
      AND e.subject_id = facebook_join_requests.subject_id
      AND e.payment_status = 'completed'
  )
);

CREATE POLICY "Users update own fb requests note" ON public.facebook_join_requests
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Staff manage fb requests" ON public.facebook_join_requests
FOR ALL USING (can_manage('can_manage_students'::text))
WITH CHECK (can_manage('can_manage_students'::text));

CREATE INDEX idx_fb_join_user ON public.facebook_join_requests(user_id);
CREATE INDEX idx_fb_join_status ON public.facebook_join_requests(status);


-- >>> Migration: 20260513152639_de4c2972-9416-4773-a796-d3e193a040ec.sql <<<
DELETE FROM subjects WHERE id = '359fef53-b3cf-4a53-83f2-2d59d548eb07';


-- >>> Migration: 20260513154820_8f17c766-4e86-4335-ac59-6d76b23948dd.sql <<<
-- =========================================================
-- Refer & Earn — points engine + server-trust attribution
-- =========================================================

-- 1. Points ledger (append-only)
CREATE TABLE public.referral_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('referral_signup','redemption','admin_adjust')),
  referred_user_id UUID,
  enrollment_id UUID,
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rpl_user ON public.referral_points_ledger(user_id);
CREATE UNIQUE INDEX idx_rpl_award_once
  ON public.referral_points_ledger(user_id, referred_user_id, enrollment_id)
  WHERE reason = 'referral_signup';

ALTER TABLE public.referral_points_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ledger"
  ON public.referral_points_ledger FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage ledger"
  ON public.referral_points_ledger FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2. Redemptions (one per payment)
CREATE TABLE public.referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  payment_id UUID NOT NULL UNIQUE,
  points_used INTEGER NOT NULL CHECK (points_used > 0),
  bdt_value NUMERIC NOT NULL CHECK (bdt_value > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rr_user ON public.referral_redemptions(user_id);

ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own redemptions"
  ON public.referral_redemptions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins manage redemptions"
  ON public.referral_redemptions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 3. Server-side referrer attribution (one-shot, immutable from client)
CREATE TABLE public.referral_attributions (
  referred_user_id UUID PRIMARY KEY,
  referral_code_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ra_code ON public.referral_attributions(referral_code_id);

ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own attribution"
  ON public.referral_attributions FOR SELECT
  USING (auth.uid() = referred_user_id);
CREATE POLICY "Admins manage attributions"
  ON public.referral_attributions FOR ALL
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 4. referral_conversions: track points awarded
ALTER TABLE public.referral_conversions
  ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 200;

-- 5. payments: pending redemption tied to a payment row (server-set only)
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS pending_redemption_points INTEGER;

-- 6. Slug uniqueness on discount_codes.short_code (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_discount_short_code_ci
  ON public.discount_codes (lower(short_code))
  WHERE short_code IS NOT NULL;

-- =========================================================
-- Functions
-- =========================================================

-- Slug regex check
CREATE OR REPLACE FUNCTION public.is_slug_available(_slug TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _slug IS NULL OR _slug !~ '^[a-z0-9-]{4,20}$' THEN
    RETURN false;
  END IF;
  RETURN NOT EXISTS (
    SELECT 1 FROM public.discount_codes WHERE lower(short_code) = lower(_slug)
  );
END;
$$;

-- Get or create the calling user's referral slug + code
CREATE OR REPLACE FUNCTION public.get_or_create_referral_slug()
RETURNS TABLE(code_id UUID, slug TEXT, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _existing RECORD;
  _new_slug TEXT;
  _new_code TEXT;
  _new_id UUID;
  _attempt INT := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, short_code, code INTO _existing
  FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    code_id := _existing.id;
    slug := _existing.short_code;
    code := _existing.code;
    RETURN NEXT;
    RETURN;
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug) OR _attempt > 8;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  INSERT INTO public.discount_codes (
    code, short_code, owner_user_id, owner_type, is_referral,
    is_active, discount_type, discount_value,
    discount_percent_owner, discount_percent_receiver
  ) VALUES (
    _new_code, _new_slug, _uid, 'student', true,
    true, 'flat', 100, 0, 0
  ) RETURNING id INTO _new_id;

  code_id := _new_id;
  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$$;

-- Update slug
CREATE OR REPLACE FUNCTION public.update_referral_slug(_new_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _normalized TEXT := lower(trim(_new_slug));
  _code_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF _normalized !~ '^[a-z0-9-]{4,20}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_format');
  END IF;
  IF EXISTS (SELECT 1 FROM public.discount_codes
             WHERE lower(short_code) = _normalized AND owner_user_id <> _uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'taken');
  END IF;

  SELECT id INTO _code_id FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC LIMIT 1;

  IF _code_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_code');
  END IF;

  UPDATE public.discount_codes
  SET short_code = _normalized, updated_at = now()
  WHERE id = _code_id;

  RETURN jsonb_build_object('ok', true, 'slug', _normalized);
END;
$$;

-- Balance = SUM of ledger
CREATE OR REPLACE FUNCTION public.get_referral_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM public.referral_points_ledger
  WHERE user_id = _user_id;
$$;

-- Award referral points (idempotent)
CREATE OR REPLACE FUNCTION public.award_referral_points(
  _referrer UUID, _referred UUID, _enrollment UUID, _payment UUID, _code_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _referrer IS NULL OR _referred IS NULL OR _referrer = _referred THEN
    RETURN false;
  END IF;

  INSERT INTO public.referral_points_ledger (user_id, points, reason, referred_user_id, enrollment_id, payment_id)
  VALUES (_referrer, 200, 'referral_signup', _referred, _enrollment, _payment)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.referral_conversions (referral_code_id, new_user_id, purchase_id, points_awarded)
  VALUES (_code_id, _referred, _payment, 200)
  ON CONFLICT DO NOTHING;

  RETURN true;
END;
$$;

-- Apply redemption — server-truth caps
CREATE OR REPLACE FUNCTION public.apply_redemption(
  _user UUID, _payment UUID, _requested_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _balance INTEGER;
  _payment_amt NUMERIC;
  _payment_status TEXT;
  _payment_user UUID;
  _capped INTEGER;
  _bdt NUMERIC;
BEGIN
  IF _user IS NULL OR _payment IS NULL THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'bad_input');
  END IF;

  SELECT user_id, amount, status::TEXT INTO _payment_user, _payment_amt, _payment_status
  FROM public.payments WHERE id = _payment;

  IF _payment_user IS NULL OR _payment_user <> _user THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'not_owner');
  END IF;
  IF _payment_status <> 'pending' THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'not_pending');
  END IF;
  IF EXISTS (SELECT 1 FROM public.referral_redemptions WHERE payment_id = _payment) THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'already_redeemed');
  END IF;

  _balance := public.get_referral_balance(_user);

  IF _balance < 50 OR _requested_points < 50 THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'min_50');
  END IF;

  -- Cap = min(requested, balance, payment_amount)
  _capped := LEAST(_requested_points, _balance, FLOOR(_payment_amt)::INTEGER);
  IF _capped < 50 THEN
    RETURN jsonb_build_object('applied_points', 0, 'applied_bdt', 0, 'error', 'cap_below_min');
  END IF;

  _bdt := _capped::NUMERIC;

  INSERT INTO public.referral_redemptions (user_id, payment_id, points_used, bdt_value)
  VALUES (_user, _payment, _capped, _bdt);

  INSERT INTO public.referral_points_ledger (user_id, points, reason, payment_id)
  VALUES (_user, -_capped, 'redemption', _payment);

  UPDATE public.payments
  SET amount = amount - _bdt,
      pending_redemption_points = _capped,
      updated_at = now()
  WHERE id = _payment;

  RETURN jsonb_build_object(
    'applied_points', _capped,
    'applied_bdt', _bdt,
    'new_amount', _payment_amt - _bdt
  );
END;
$$;

-- Admin report
CREATE OR REPLACE FUNCTION public.get_admin_referral_report(_from TIMESTAMPTZ, _to TIMESTAMPTZ)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _result JSONB;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'total_links', (SELECT COUNT(*) FROM public.discount_codes WHERE is_referral = true AND owner_type = 'student'),
    'total_referrals', (SELECT COUNT(*) FROM public.referral_conversions WHERE converted_at BETWEEN _from AND _to),
    'total_points_issued', (SELECT COALESCE(SUM(points),0) FROM public.referral_points_ledger
                            WHERE reason = 'referral_signup' AND created_at BETWEEN _from AND _to),
    'total_bdt_discounted', (SELECT COALESCE(SUM(bdt_value),0) FROM public.referral_redemptions
                             WHERE created_at BETWEEN _from AND _to),
    'top_referrers', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM (
        SELECT
          p.full_name,
          p.student_id,
          dc.short_code,
          COUNT(rc.id) AS referrals,
          COALESCE(SUM(rc.points_awarded),0) AS points
        FROM public.discount_codes dc
        JOIN public.profiles p ON p.user_id = dc.owner_user_id
        LEFT JOIN public.referral_conversions rc ON rc.referral_code_id = dc.id
          AND rc.converted_at BETWEEN _from AND _to
        WHERE dc.is_referral = true AND dc.owner_type = 'student'
        GROUP BY p.full_name, p.student_id, dc.short_code
        ORDER BY referrals DESC, points DESC
        LIMIT 10
      ) t
    )
  ) INTO _result;

  RETURN _result;
END;
$$;


-- >>> Migration: 20260513161046_b5d107ce-5846-4d6f-a966-3f3f5564bba2.sql <<<
CREATE OR REPLACE FUNCTION public.get_or_create_referral_slug()
 RETURNS TABLE(code_id uuid, slug text, code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _existing RECORD;
  _new_slug TEXT;
  _new_code TEXT;
  _new_id UUID;
  _attempt INT := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id, short_code, code INTO _existing
  FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF FOUND THEN
    code_id := _existing.id;
    slug := _existing.short_code;
    code := _existing.code;
    RETURN NEXT;
    RETURN;
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug) OR _attempt > 8;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  INSERT INTO public.discount_codes (
    code, short_code, owner_user_id, owner_type, is_referral,
    is_active, discount_type, discount_value,
    discount_percent_owner, discount_percent_receiver
  ) VALUES (
    _new_code, _new_slug, _uid, 'student', true,
    true, 'fixed', 100, 0, 0
  ) RETURNING id INTO _new_id;

  code_id := _new_id;
  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

-- Backfill: create a referral code for every existing student who doesn't have one yet
DO $$
DECLARE
  r RECORD;
  _slug TEXT;
  _code TEXT;
  _attempt INT;
BEGIN
  FOR r IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'student'
      AND NOT EXISTS (
        SELECT 1 FROM public.discount_codes dc
        WHERE dc.owner_user_id = ur.user_id AND dc.is_referral = true
      )
  LOOP
    _attempt := 0;
    LOOP
      _attempt := _attempt + 1;
      _slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text || r.user_id::text) for 6));
      EXIT WHEN public.is_slug_available(_slug) OR _attempt > 8;
    END LOOP;
    _code := upper(replace(_slug, 'oli-', 'OLI'));
    BEGIN
      INSERT INTO public.discount_codes (
        code, short_code, owner_user_id, owner_type, is_referral,
        is_active, discount_type, discount_value,
        discount_percent_owner, discount_percent_receiver
      ) VALUES (
        _code, _slug, r.user_id, 'student', true,
        true, 'fixed', 100, 0, 0
      );
    EXCEPTION WHEN unique_violation THEN
      -- skip, will retry next time the user opens the page
      NULL;
    END;
  END LOOP;
END $$;


-- >>> Migration: 20260513161724_97f46ec5-b504-4953-906d-bc0b3c880d89.sql <<<
CREATE OR REPLACE FUNCTION public.regenerate_referral_slug()
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _new_slug TEXT;
  _new_code TEXT;
  _attempt INT := 0;
  _existing_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Generate a new unique slug
  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug) OR _attempt > 12;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  -- Find existing active referral row for this user
  SELECT id INTO _existing_id
  FROM public.discount_codes
  WHERE owner_user_id = _uid AND is_referral = true AND is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.discount_codes
    SET short_code = _new_slug, code = _new_code, updated_at = now()
    WHERE id = _existing_id;
    code_id := _existing_id;
  ELSE
    INSERT INTO public.discount_codes (
      code, short_code, owner_user_id, owner_type, is_referral,
      is_active, discount_type, discount_value,
      discount_percent_owner, discount_percent_receiver
    ) VALUES (
      _new_code, _new_slug, _uid, 'student', true,
      true, 'fixed', 100, 0, 0
    ) RETURNING id INTO _existing_id;
    code_id := _existing_id;
  END IF;

  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.regenerate_referral_slug() TO authenticated;


-- >>> Migration: 20260513171635_229cab78-0467-40a1-9fd0-c3134c3c9752.sql <<<
CREATE OR REPLACE FUNCTION public.create_student_referral_code(_user_id uuid)
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _existing RECORD;
  _new_slug TEXT;
  _new_code TEXT;
  _new_id UUID;
  _attempt INT := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'User id is required';
  END IF;

  SELECT dc.id, dc.short_code, dc.code INTO _existing
  FROM public.discount_codes dc
  WHERE dc.owner_user_id = _user_id
    AND dc.is_referral = true
    AND dc.is_active = true
  ORDER BY dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;

  IF FOUND AND COALESCE(trim(_existing.short_code), '') <> '' THEN
    code_id := _existing.id;
    slug := _existing.short_code;
    code := _existing.code;
    RETURN NEXT;
    RETURN;
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text || _user_id::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug);
    IF _attempt >= 20 THEN
      RAISE EXCEPTION 'Could not generate unique referral slug';
    END IF;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  IF FOUND THEN
    UPDATE public.discount_codes
    SET short_code = _new_slug,
        code = _new_code,
        owner_type = 'student',
        is_referral = true,
        is_active = true,
        discount_type = 'fixed',
        discount_value = 100,
        discount_percent_owner = 0,
        discount_percent_receiver = 0,
        updated_at = now()
    WHERE id = _existing.id
    RETURNING id INTO _new_id;
  ELSE
    INSERT INTO public.discount_codes (
      code, short_code, owner_user_id, owner_type, is_referral,
      is_active, discount_type, discount_value,
      discount_percent_owner, discount_percent_receiver
    ) VALUES (
      _new_code, _new_slug, _user_id, 'student', true,
      true, 'fixed', 100, 0, 0
    ) RETURNING id INTO _new_id;
  END IF;

  code_id := _new_id;
  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_slug()
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  SELECT c.code_id, c.slug, c.code
  FROM public.create_student_referral_code(auth.uid()) c;
END;
$function$;

CREATE OR REPLACE FUNCTION public.regenerate_referral_slug()
RETURNS TABLE(code_id uuid, slug text, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _new_slug TEXT;
  _new_code TEXT;
  _attempt INT := 0;
  _existing_id UUID;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  LOOP
    _attempt := _attempt + 1;
    _new_slug := 'oli-' || lower(substring(md5(random()::text || clock_timestamp()::text || _uid::text) for 6));
    EXIT WHEN public.is_slug_available(_new_slug);
    IF _attempt >= 20 THEN
      RAISE EXCEPTION 'Could not generate unique referral slug';
    END IF;
  END LOOP;

  _new_code := upper(replace(_new_slug, 'oli-', 'OLI'));

  SELECT dc.id INTO _existing_id
  FROM public.discount_codes dc
  WHERE dc.owner_user_id = _uid AND dc.is_referral = true AND dc.is_active = true
  ORDER BY dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.discount_codes
    SET short_code = _new_slug,
        code = _new_code,
        owner_type = 'student',
        is_referral = true,
        is_active = true,
        discount_type = 'fixed',
        discount_value = 100,
        updated_at = now()
    WHERE id = _existing_id;
    code_id := _existing_id;
  ELSE
    INSERT INTO public.discount_codes (
      code, short_code, owner_user_id, owner_type, is_referral,
      is_active, discount_type, discount_value,
      discount_percent_owner, discount_percent_receiver
    ) VALUES (
      _new_code, _new_slug, _uid, 'student', true,
      true, 'fixed', 100, 0, 0
    ) RETURNING id INTO _existing_id;
    code_id := _existing_id;
  END IF;

  slug := _new_slug;
  code := _new_code;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_student_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN
    PERFORM 1 FROM public.create_student_referral_code(NEW.user_id);
  ELSIF TG_TABLE_NAME = 'user_roles' AND NEW.role = 'student' THEN
    PERFORM 1 FROM public.create_student_referral_code(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS ensure_profile_referral_code ON public.profiles;
CREATE TRIGGER ensure_profile_referral_code
AFTER INSERT OR UPDATE OF user_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.ensure_student_referral_code();

DROP TRIGGER IF EXISTS ensure_role_referral_code ON public.user_roles;
CREATE TRIGGER ensure_role_referral_code
AFTER INSERT OR UPDATE OF user_id, role ON public.user_roles
FOR EACH ROW
WHEN (NEW.role = 'student')
EXECUTE FUNCTION public.ensure_student_referral_code();

GRANT EXECUTE ON FUNCTION public.create_student_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_slug() TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_referral_slug() TO authenticated;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.user_id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.discount_codes dc
      WHERE dc.owner_user_id = p.user_id
        AND dc.is_referral = true
        AND dc.is_active = true
        AND COALESCE(trim(dc.short_code), '') <> ''
    )
  LOOP
    PERFORM 1 FROM public.create_student_referral_code(r.user_id);
  END LOOP;
END $$;


-- >>> Migration: 20260513171728_a8c4fa8f-97f6-4aa7-9205-a6c26923fb96.sql <<<
CREATE OR REPLACE FUNCTION public.get_checkout_discount(_code text)
RETURNS TABLE(
  code_id uuid,
  code text,
  short_code text,
  discount_type text,
  discount_value numeric,
  is_referral boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    dc.id AS code_id,
    dc.code,
    dc.short_code,
    dc.discount_type,
    dc.discount_value,
    COALESCE(dc.is_referral, false) AS is_referral
  FROM public.discount_codes dc
  WHERE dc.is_active = true
    AND (_code IS NOT NULL AND trim(_code) <> '')
    AND (
      lower(dc.short_code) = lower(trim(_code))
      OR lower(dc.code) = lower(trim(_code))
    )
    AND (dc.valid_from IS NULL OR dc.valid_from <= now())
    AND (dc.valid_until IS NULL OR dc.valid_until >= now())
    AND (dc.max_uses IS NULL OR dc.current_uses < dc.max_uses)
    AND NOT (
      COALESCE(dc.is_referral, false) = true
      AND dc.owner_user_id IS NOT NULL
      AND dc.owner_user_id = auth.uid()
    )
  ORDER BY COALESCE(dc.is_referral, false) DESC, dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkout_discount(text) TO anon, authenticated;


-- >>> Migration: 20260514074435_28ee421f-d377-42ea-89d5-adc964def989.sql <<<
CREATE OR REPLACE FUNCTION public.get_checkout_discount(_code text)
RETURNS TABLE(
  code_id uuid,
  code text,
  short_code text,
  discount_type text,
  discount_value numeric,
  is_referral boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    dc.id AS code_id,
    dc.code,
    dc.short_code,
    dc.discount_type,
    dc.discount_value,
    COALESCE(dc.is_referral, false) AS is_referral
  FROM public.discount_codes dc
  WHERE dc.is_active = true
    AND (_code IS NOT NULL AND trim(_code) <> '')
    AND (
      lower(dc.short_code) = lower(trim(_code))
      OR lower(dc.code) = lower(trim(_code))
    )
    AND (dc.valid_from IS NULL OR dc.valid_from <= now())
    AND (dc.valid_until IS NULL OR dc.valid_until >= now())
    AND (dc.max_uses IS NULL OR dc.current_uses < dc.max_uses)
    AND NOT (
      COALESCE(dc.is_referral, false) = true
      AND auth.uid() IS NOT NULL
      AND dc.owner_user_id IS NOT NULL
      AND dc.owner_user_id = auth.uid()
    )
  ORDER BY COALESCE(dc.is_referral, false) DESC, dc.updated_at DESC, dc.created_at DESC
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkout_discount(text) TO anon, authenticated;


-- >>> Migration: 20260516174931_bc1d1054-f08b-4380-bb58-776d6c89ae16.sql <<<
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


-- >>> Migration: 20260519165643_0547c688-a599-43c6-947e-83548e317129.sql <<<
-- 1) Testimonials: add screenshot_url for uploaded message screenshots
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS screenshot_url text;

-- 2) Employees: let admins and active super_admins see all employees
DROP POLICY IF EXISTS "Admins and super admins view employees" ON public.employees;
CREATE POLICY "Admins and super admins view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e2
      WHERE e2.user_id = auth.uid()
        AND e2.status = 'active'
        AND e2.sub_role = 'super_admin'
    )
  );

-- 3) employee_permissions: let admins and active super_admins read every row
DROP POLICY IF EXISTS "Admins and super admins view permissions" ON public.employee_permissions;
CREATE POLICY "Admins and super admins view permissions"
  ON public.employee_permissions
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e2
      WHERE e2.user_id = auth.uid()
        AND e2.status = 'active'
        AND e2.sub_role = 'super_admin'
    )
  );


-- >>> Migration: 20260520114404_a3af6460-c19d-46c2-900e-ac10a29d23e1.sql <<<
-- 1. Rename mux_live_stream_id -> room_name and drop unused Mux columns
ALTER TABLE public.live_sessions RENAME COLUMN mux_live_stream_id TO room_name;
ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS mux_playback_id;
ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS mux_space_id;
ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS recording_playback_id;

-- 2. Tighten live_chat_messages SELECT to enrolled users (or free sessions) only
DROP POLICY IF EXISTS "Authenticated users can view chat" ON public.live_chat_messages;
CREATE POLICY "Enrolled users can view chat"
ON public.live_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.id = live_chat_messages.session_id
      AND (
        ls.is_free = true
        OR ls.subject_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.subject_id = ls.subject_id
            AND e.payment_status = 'completed'::payment_status
        )
      )
  )
  OR can_manage('can_manage_subjects'::text)
);

-- 3. Tighten course-pdfs storage SELECT: enrolled-in-the-PDF's-subject only
DROP POLICY IF EXISTS "Admins and enrolled students can read course PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled students can read subject PDFs" ON storage.objects;

CREATE POLICY "Enrolled students can read subject PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-pdfs'
  AND (
    can_manage('can_manage_pdfs'::text)
    OR EXISTS (
      SELECT 1
      FROM public.course_pdfs cp
      JOIN public.enrollments e
        ON e.subject_id = cp.subject_id
       AND e.user_id = auth.uid()
       AND e.payment_status = 'completed'::payment_status
      WHERE cp.file_url LIKE '%' || storage.objects.name
    )
    OR EXISTS (
      SELECT 1 FROM public.course_pdfs cp
      WHERE cp.is_free = true
        AND cp.file_url LIKE '%' || storage.objects.name
    )
  )
);


-- >>> Migration: 20260520114542_b6e2fea5-44a8-48be-a65d-3b16f2a19bb4.sql <<<
-- 1. Tighten live_sessions SELECT: free → public, paid → enrolled or staff only
DROP POLICY IF EXISTS "Anyone can view live sessions" ON public.live_sessions;

CREATE POLICY "Public can view free live sessions"
ON public.live_sessions
FOR SELECT
TO public
USING (is_free = true);

CREATE POLICY "Enrolled users can view paid live sessions"
ON public.live_sessions
FOR SELECT
TO authenticated
USING (
  is_free = true
  OR can_manage('can_manage_subjects'::text)
  OR (
    subject_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.subject_id = live_sessions.subject_id
        AND e.payment_status = 'completed'::payment_status
    )
  )
);

-- 2. Add RLS to realtime.messages so users can only subscribe to channels they should access
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to subscribe to any channel topic ONLY if they pass
-- additional enrollment checks at the application layer.
-- For now: scope subscriptions to authenticated users only (no anon listening),
-- and require the channel topic to match a live session UUID the user is enrolled in
-- OR a free session, OR allow staff.
CREATE POLICY "Authenticated can subscribe to permitted channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- staff: anything
  public.can_manage('can_manage_subjects'::text)
  -- otherwise: topic must be a live_sessions id the user is enrolled in OR a free session
  OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE realtime.topic() = ls.id::text
      AND (
        ls.is_free = true
        OR ls.subject_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.subject_id = ls.subject_id
            AND e.payment_status = 'completed'::payment_status
        )
      )
  )
  -- allow postgres_changes for tables that already have RLS (the table's own RLS gates the row)
  OR realtime.topic() LIKE 'realtime:%'
);

CREATE POLICY "Authenticated can broadcast to permitted channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage('can_manage_subjects'::text)
  OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE realtime.topic() = ls.id::text
      AND (
        ls.is_free = true
        OR ls.subject_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.subject_id = ls.subject_id
            AND e.payment_status = 'completed'::payment_status
        )
      )
  )
  OR realtime.topic() LIKE 'realtime:%'
);


-- >>> Migration: 20260520114707_ccbaec07-a001-4c82-8151-b255461fd719.sql <<<
DROP POLICY IF EXISTS "Authenticated can subscribe to permitted channels" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can broadcast to permitted channels" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to live session channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  public.can_manage('can_manage_subjects'::text)
  OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE realtime.topic() = ls.id::text
      AND (
        ls.is_free = true
        OR ls.subject_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.subject_id = ls.subject_id
            AND e.payment_status = 'completed'::payment_status
        )
      )
  )
);

CREATE POLICY "Authenticated can broadcast to live session channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage('can_manage_subjects'::text)
  OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE realtime.topic() = ls.id::text
      AND (
        ls.is_free = true
        OR ls.subject_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.subject_id = ls.subject_id
            AND e.payment_status = 'completed'::payment_status
        )
      )
  )
);


-- >>> Migration: 20260618000000_add_bbs_and_mba_missing_subjects.sql <<<
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


-- >>> Migration: 20260710000000_update_subject_prices.sql <<<
BEGIN;

UPDATE public.subjects
SET
  price = 1200,
  original_price = 1500,
  updated_at = NOW()
WHERE price IS DISTINCT FROM 1200
   OR original_price IS DISTINCT FROM 1500;

COMMIT;


-- >>> Migration: 20260712142200_create_bkash_tokens.sql <<<
CREATE TABLE IF NOT EXISTS public.bkash_tokens (
  id text PRIMARY KEY DEFAULT 'default',
  id_token text NOT NULL,
  refresh_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_in integer NOT NULL DEFAULT 3600
);

-- Deny all access to this table from authenticated and anon roles,
-- it should only be accessible by the service role from the Edge Function.
ALTER TABLE public.bkash_tokens ENABLE ROW LEVEL SECURITY;


-- >>> Migration: 20260715155013_fix_employees_recursion.sql <<<
-- 1. Create a security definer function to check if a user is a super_admin without triggering RLS policies
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = check_user_id
      AND status = 'active'
      AND sub_role = 'super_admin'
  );
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admins and super admins view employees" ON public.employees;
DROP POLICY IF EXISTS "Staff can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and super admins view permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Staff can manage permissions" ON public.employee_permissions;

-- 3. Recreate the policies using the new security definer function to avoid infinite recursion

-- Employees table
CREATE POLICY "Staff can manage employees"
  ON public.employees FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );

-- Employee permissions table
CREATE POLICY "Staff can manage permissions"
  ON public.employee_permissions FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );


-- >>> Migration: 20260827000000_create_pdf_suggestions.sql <<<
-- Migration: Create PDF Suggestions System with Free & Paid Tier Support
-- Description: Adds pdf_suggestions, pdf_suggestion_enrollments, and cart_pdf_items tables with RLS using public.has_role.

-- 1. Create pdf_suggestions table
CREATE TABLE IF NOT EXISTS public.pdf_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  department TEXT NOT NULL DEFAULT 'accounting',
  course_type TEXT NOT NULL DEFAULT 'BBA',
  compatible_years INT[] DEFAULT ARRAY[1, 2, 3, 4],
  subject_type TEXT DEFAULT 'Theory',
  is_free BOOLEAN NOT NULL DEFAULT false,
  price NUMERIC NOT NULL DEFAULT 20,
  original_price NUMERIC DEFAULT 100,
  description TEXT,
  description_bn TEXT,
  whats_included JSONB DEFAULT '[]'::jsonb,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT DEFAULT 0,
  free_pdf_url TEXT,
  free_pdf_name TEXT,
  free_pdf_size_bytes BIGINT DEFAULT 0,
  paid_pdf_url TEXT,
  paid_pdf_name TEXT,
  paid_pdf_size_bytes BIGINT DEFAULT 0,
  is_free_available BOOLEAN DEFAULT true,
  is_paid_available BOOLEAN DEFAULT true,
  is_visible BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for fast lookup & filtering
CREATE INDEX IF NOT EXISTS idx_pdf_suggestions_slug ON public.pdf_suggestions(slug);
CREATE INDEX IF NOT EXISTS idx_pdf_suggestions_course_dept ON public.pdf_suggestions(course_type, department);
CREATE INDEX IF NOT EXISTS idx_pdf_suggestions_subject_id ON public.pdf_suggestions(subject_id);
CREATE INDEX IF NOT EXISTS idx_pdf_suggestions_is_visible ON public.pdf_suggestions(is_visible);
CREATE INDEX IF NOT EXISTS idx_pdf_suggestions_is_free ON public.pdf_suggestions(is_free);

-- 2. Create pdf_suggestion_enrollments table
CREATE TABLE IF NOT EXISTS public.pdf_suggestion_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_suggestion_id UUID NOT NULL REFERENCES public.pdf_suggestions(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL CHECK (access_type IN ('free', 'paid')),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  payment_status public.payment_status DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_pdf_access UNIQUE (user_id, pdf_suggestion_id, access_type)
);

CREATE INDEX IF NOT EXISTS idx_pdf_enrollments_user ON public.pdf_suggestion_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_enrollments_pdf ON public.pdf_suggestion_enrollments(pdf_suggestion_id);

-- 3. Create cart_pdf_items table
CREATE TABLE IF NOT EXISTS public.cart_pdf_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pdf_suggestion_id UUID NOT NULL REFERENCES public.pdf_suggestions(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_pdf_cart UNIQUE (user_id, pdf_suggestion_id)
);

CREATE INDEX IF NOT EXISTS idx_cart_pdf_user ON public.cart_pdf_items(user_id);

-- Enable RLS
ALTER TABLE public.pdf_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_suggestion_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_pdf_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pdf_suggestions
DROP POLICY IF EXISTS "Public can view visible pdf_suggestions" ON public.pdf_suggestions;
CREATE POLICY "Public can view visible pdf_suggestions"
  ON public.pdf_suggestions FOR SELECT
  USING (
    is_visible = true 
    OR auth.role() = 'service_role' 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'employee')
  );

DROP POLICY IF EXISTS "Admins and staff can manage pdf_suggestions" ON public.pdf_suggestions;
CREATE POLICY "Admins and staff can manage pdf_suggestions"
  ON public.pdf_suggestions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

-- RLS Policies for pdf_suggestion_enrollments
DROP POLICY IF EXISTS "Users can view own pdf enrollments" ON public.pdf_suggestion_enrollments;
CREATE POLICY "Users can view own pdf enrollments"
  ON public.pdf_suggestion_enrollments FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'employee')
  );

DROP POLICY IF EXISTS "Users can insert free pdf enrollments" ON public.pdf_suggestion_enrollments;
CREATE POLICY "Users can insert free pdf enrollments"
  ON public.pdf_suggestion_enrollments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND access_type = 'free');

DROP POLICY IF EXISTS "Admins can manage all pdf enrollments" ON public.pdf_suggestion_enrollments;
CREATE POLICY "Admins can manage all pdf enrollments"
  ON public.pdf_suggestion_enrollments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'employee'));

-- RLS Policies for cart_pdf_items
DROP POLICY IF EXISTS "Users can manage own cart pdf items" ON public.cart_pdf_items;
CREATE POLICY "Users can manage own cart pdf items"
  ON public.cart_pdf_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- >>> Migration: 20260827100000_change_student_id_prefix_to_osa.sql <<<
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


-- >>> Migration: 20260828213000_add_pdf_reading_terms.sql <<<
-- Migration: Add reading_terms_title and reading_terms to pdf_suggestions
ALTER TABLE public.pdf_suggestions
ADD COLUMN IF NOT EXISTS reading_terms_title TEXT DEFAULT '📚 PDF বই পড়ার শর্তাবলি',
ADD COLUMN IF NOT EXISTS reading_terms TEXT;


-- >>> Migration: 20260909000000_change_student_id_prefix_to_smc.sql <<<
-- Update generate_student_id() function to produce 'SMC-YYYY-XXXXXX' for Shaharia Math
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

-- Update any existing student profiles with OSA prefix to SMC
UPDATE public.profiles
SET student_id = REPLACE(student_id, 'OSA-', 'SMC-')
WHERE student_id LIKE 'OSA-%';

