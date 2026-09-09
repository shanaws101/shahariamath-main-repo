
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
