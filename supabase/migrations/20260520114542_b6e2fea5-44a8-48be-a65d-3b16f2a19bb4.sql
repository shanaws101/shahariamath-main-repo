-- 1. Tighten live_sessions SELECT: free → public, paid → enrolled or staff only
DROP POLICY IF EXISTS "Anyone can view live sessions" ON public.live_sessions;

CREATE POLICY "Public can view free live sessions"
ON public.live_sessions
FOR SELECT
TO public
USING (is_free = true);

CREATE POLICY "Enrolled users can view paid live sessions"
ON public.live_sessions
FOR SELECT
TO authenticated
USING (
  is_free = true
  OR can_manage('can_manage_subjects'::text)
  OR (
    subject_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.user_id = auth.uid()
        AND e.subject_id = live_sessions.subject_id
        AND e.payment_status = 'completed'::payment_status
    )
  )
);

-- 2. RLS on realtime.messages is enabled by default by Supabase

-- Allow authenticated users to subscribe to any channel topic ONLY if they pass
-- additional enrollment checks at the application layer.
-- For now: scope subscriptions to authenticated users only (no anon listening),
-- and require the channel topic to match a live session UUID the user is enrolled in
-- OR a free session, OR allow staff.
CREATE POLICY "Authenticated can subscribe to permitted channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- staff: anything
  public.can_manage('can_manage_subjects'::text)
  -- otherwise: topic must be a live_sessions id the user is enrolled in OR a free session
  OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE realtime.topic() = ls.id::text
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
  -- allow postgres_changes for tables that already have RLS (the table's own RLS gates the row)
  OR realtime.topic() LIKE 'realtime:%'
);

CREATE POLICY "Authenticated can broadcast to permitted channels"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.can_manage('can_manage_subjects'::text)
  OR EXISTS (
    SELECT 1 FROM public.live_sessions ls
    WHERE realtime.topic() = ls.id::text
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
  OR realtime.topic() LIKE 'realtime:%'
);