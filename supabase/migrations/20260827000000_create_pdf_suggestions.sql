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
