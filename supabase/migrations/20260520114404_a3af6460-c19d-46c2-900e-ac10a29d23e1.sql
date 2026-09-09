-- 1. Rename mux_live_stream_id -> room_name and drop unused Mux columns
ALTER TABLE public.live_sessions RENAME COLUMN mux_live_stream_id TO room_name;
ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS mux_playback_id;
ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS mux_space_id;
ALTER TABLE public.live_sessions DROP COLUMN IF EXISTS recording_playback_id;

-- 2. Tighten live_chat_messages SELECT to enrolled users (or free sessions) only
DROP POLICY IF EXISTS "Authenticated users can view chat" ON public.live_chat_messages;
CREATE POLICY "Enrolled users can view chat"
ON public.live_chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE ls.id = live_chat_messages.session_id
      AND (
        ls.is_free = true
        OR ls.subject_id IS NULL
        OR EXISTS (
          SELECT 1 FROM public.enrollments e
          WHERE e.user_id = auth.uid()
            AND e.subject_id = ls.subject_id
            AND e.payment_status = 'completed'::payment_status
        )
      )
  )
  OR can_manage('can_manage_subjects'::text)
);

-- 3. Tighten course-pdfs storage SELECT: enrolled-in-the-PDF's-subject only
DROP POLICY IF EXISTS "Admins and enrolled students can read course PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Enrolled students can read subject PDFs" ON storage.objects;

CREATE POLICY "Enrolled students can read subject PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-pdfs'
  AND (
    can_manage('can_manage_pdfs'::text)
    OR EXISTS (
      SELECT 1
      FROM public.course_pdfs cp
      JOIN public.enrollments e
        ON e.subject_id = cp.subject_id
       AND e.user_id = auth.uid()
       AND e.payment_status = 'completed'::payment_status
      WHERE cp.file_url LIKE '%' || storage.objects.name
    )
    OR EXISTS (
      SELECT 1 FROM public.course_pdfs cp
      WHERE cp.is_free = true
        AND cp.file_url LIKE '%' || storage.objects.name
    )
  )
);