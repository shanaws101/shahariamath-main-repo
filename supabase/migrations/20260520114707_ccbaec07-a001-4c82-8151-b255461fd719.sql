DROP POLICY IF EXISTS "Authenticated can subscribe to permitted channels" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated can broadcast to permitted channels" ON realtime.messages;

CREATE POLICY "Authenticated can subscribe to live session channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
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
);

CREATE POLICY "Authenticated can broadcast to live session channels"
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
);