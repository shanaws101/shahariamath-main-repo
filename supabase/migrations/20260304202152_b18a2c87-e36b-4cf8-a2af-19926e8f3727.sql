
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
