
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
