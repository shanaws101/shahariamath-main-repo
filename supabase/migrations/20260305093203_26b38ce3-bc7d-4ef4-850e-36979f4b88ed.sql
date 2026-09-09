
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
