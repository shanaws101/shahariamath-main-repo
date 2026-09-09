
-- Add demo video URL to class_schedules for free class previews
ALTER TABLE public.class_schedules ADD COLUMN IF NOT EXISTS demo_video_url TEXT;
