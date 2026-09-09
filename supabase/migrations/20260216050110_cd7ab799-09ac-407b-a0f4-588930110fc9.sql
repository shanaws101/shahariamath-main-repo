
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
