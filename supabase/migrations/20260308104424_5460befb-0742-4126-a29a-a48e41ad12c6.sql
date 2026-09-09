
-- 1. FIX CRITICAL: Enrollment INSERT - restrict payment_status to 'pending' only
DROP POLICY IF EXISTS "Users can create their own enrollments" ON public.enrollments;
CREATE POLICY "Users can create their own enrollments"
ON public.enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND payment_status = 'pending'::payment_status
);

-- 2. FIX CRITICAL: Legacy students - restrict to authenticated users only
DROP POLICY IF EXISTS "Anyone can check legacy students by phone" ON public.legacy_students;
CREATE POLICY "Authenticated users can check legacy students"
ON public.legacy_students
FOR SELECT
TO authenticated
USING (true);

-- 3. FIX CRITICAL: Chapter classes - protect paid video URLs
DROP POLICY IF EXISTS "Anyone can view classes" ON public.chapter_classes;
CREATE POLICY "Anyone can view free classes"
ON public.chapter_classes
FOR SELECT
USING (is_free = true);

CREATE POLICY "Enrolled users can view paid classes"
ON public.chapter_classes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    JOIN subject_chapters sc ON sc.subject_id = e.subject_id
    WHERE sc.id = chapter_classes.chapter_id
      AND e.user_id = auth.uid()
      AND e.payment_status = 'completed'::payment_status
  )
);

-- 4. FIX WARNING: Remove user UPDATE on payments (should only be done server-side)
DROP POLICY IF EXISTS "Users can update their own payments" ON public.payments;

-- 5. FIX WARNING: Subject chapters - protect paid chapter URLs
DROP POLICY IF EXISTS "Anyone can view chapters" ON public.subject_chapters;
CREATE POLICY "Anyone can view free chapters"
ON public.subject_chapters
FOR SELECT
USING (is_free = true);

CREATE POLICY "Enrolled users can view paid chapters"
ON public.subject_chapters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.subject_id = subject_chapters.subject_id
      AND e.user_id = auth.uid()
      AND e.payment_status = 'completed'::payment_status
  )
);
