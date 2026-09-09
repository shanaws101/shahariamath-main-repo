ALTER TABLE public.free_videos ADD COLUMN department text;
ALTER TABLE public.free_videos ADD COLUMN compatible_years integer[] DEFAULT '{1,2,3,4}';