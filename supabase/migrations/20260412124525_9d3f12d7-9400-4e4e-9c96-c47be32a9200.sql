
ALTER TABLE public.live_sessions 
ADD COLUMN recording_playback_id text,
ADD COLUMN recording_expires_at timestamp with time zone;
