
-- Drop the overly permissive policy that allows ALL authenticated users to read course PDFs
DROP POLICY IF EXISTS "Authenticated users can read PDFs" ON storage.objects;

-- Create a properly scoped policy: only admins and enrolled students can access course PDFs
CREATE POLICY "Admins and enrolled students can read course PDFs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'course-pdfs'
    AND (
      -- Admins always have access
      public.has_role(auth.uid(), 'admin')
      -- Enrolled students with completed payment can access
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        WHERE e.user_id = auth.uid()
          AND e.payment_status = 'completed'
      )
    )
  );
