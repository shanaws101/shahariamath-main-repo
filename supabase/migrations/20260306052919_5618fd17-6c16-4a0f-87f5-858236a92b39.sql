
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
