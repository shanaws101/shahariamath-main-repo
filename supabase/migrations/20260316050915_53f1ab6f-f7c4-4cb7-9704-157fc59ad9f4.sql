
-- Create can_manage function for employee permission checks
CREATE OR REPLACE FUNCTION public.can_manage(_permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin'::app_role) 
    OR EXISTS (
      SELECT 1 
      FROM employees e 
      JOIN employee_permissions ep ON ep.employee_id = e.id
      WHERE e.user_id = auth.uid() 
        AND e.status = 'active'
        AND (
          e.sub_role = 'super_admin'
          OR
          CASE _permission
            WHEN 'can_manage_subjects' THEN ep.can_manage_subjects
            WHEN 'can_manage_carousel' THEN ep.can_manage_carousel
            WHEN 'can_manage_cms' THEN ep.can_manage_cms
            WHEN 'can_manage_enrollments' THEN ep.can_manage_enrollments
            WHEN 'can_manage_students' THEN ep.can_manage_students
            WHEN 'can_manage_calendar' THEN ep.can_manage_calendar
            WHEN 'can_manage_discount_codes' THEN ep.can_manage_discount_codes
            WHEN 'can_manage_referral_codes' THEN ep.can_manage_referral_codes
            WHEN 'can_manage_videos' THEN ep.can_manage_videos
            WHEN 'can_manage_pdfs' THEN ep.can_manage_pdfs
            WHEN 'can_manage_analytics' THEN ep.can_manage_analytics
            WHEN 'can_manage_gallery' THEN ep.can_manage_gallery
            WHEN 'can_manage_subject_cms' THEN ep.can_manage_subject_cms
            ELSE false
          END
        )
    )
$$;

-- BUNDLES
DROP POLICY IF EXISTS "Admins can manage bundles" ON public.bundles;
DROP POLICY IF EXISTS "Admins can view all bundles" ON public.bundles;
CREATE POLICY "Staff can manage bundles" ON public.bundles FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

DROP POLICY IF EXISTS "Admins can manage bundle subjects" ON public.bundle_subjects;
CREATE POLICY "Staff can manage bundle subjects" ON public.bundle_subjects FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

-- CAROUSEL
DROP POLICY IF EXISTS "Admins can manage carousel banners" ON public.carousel_banners;
CREATE POLICY "Staff can manage carousel banners" ON public.carousel_banners FOR ALL TO public
  USING (can_manage('can_manage_carousel')) WITH CHECK (can_manage('can_manage_carousel'));

-- CMS
DROP POLICY IF EXISTS "Admins can manage CMS content" ON public.cms_content;
CREATE POLICY "Staff can manage CMS content" ON public.cms_content FOR ALL TO public
  USING (can_manage('can_manage_cms')) WITH CHECK (can_manage('can_manage_cms'));

-- SUBJECTS
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can view all subjects" ON public.subjects;
CREATE POLICY "Staff can manage subjects" ON public.subjects FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

-- CHAPTERS
DROP POLICY IF EXISTS "Admins can manage chapters" ON public.subject_chapters;
CREATE POLICY "Staff can manage chapters" ON public.subject_chapters FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

DROP POLICY IF EXISTS "Admins can manage classes" ON public.chapter_classes;
CREATE POLICY "Staff can manage classes" ON public.chapter_classes FOR ALL TO public
  USING (can_manage('can_manage_subjects')) WITH CHECK (can_manage('can_manage_subjects'));

-- FREE VIDEOS
DROP POLICY IF EXISTS "Admins can manage free videos" ON public.free_videos;
DROP POLICY IF EXISTS "Admins can view all free videos" ON public.free_videos;
CREATE POLICY "Staff can manage free videos" ON public.free_videos FOR ALL TO public
  USING (can_manage('can_manage_videos')) WITH CHECK (can_manage('can_manage_videos'));

-- COURSE PDFS
DROP POLICY IF EXISTS "Admins can manage PDFs" ON public.course_pdfs;
CREATE POLICY "Staff can manage PDFs" ON public.course_pdfs FOR ALL TO authenticated
  USING (can_manage('can_manage_pdfs')) WITH CHECK (can_manage('can_manage_pdfs'));

-- CLASS SCHEDULES
DROP POLICY IF EXISTS "Admins can manage class schedules" ON public.class_schedules;
DROP POLICY IF EXISTS "Admins can view all classes" ON public.class_schedules;
CREATE POLICY "Staff can manage class schedules" ON public.class_schedules FOR ALL TO public
  USING (can_manage('can_manage_calendar')) WITH CHECK (can_manage('can_manage_calendar'));

-- DISCOUNT CODES
DROP POLICY IF EXISTS "Admins can manage discount codes" ON public.discount_codes;
CREATE POLICY "Staff can manage discount codes" ON public.discount_codes FOR ALL TO public
  USING (can_manage('can_manage_discount_codes')) WITH CHECK (can_manage('can_manage_discount_codes'));

-- GALLERY
DROP POLICY IF EXISTS "Admins can manage gallery images" ON public.gallery_images;
CREATE POLICY "Staff can manage gallery images" ON public.gallery_images FOR ALL TO public
  USING (can_manage('can_manage_gallery')) WITH CHECK (can_manage('can_manage_gallery'));

-- BLOG
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can view all blog posts" ON public.blog_posts;
CREATE POLICY "Staff can manage blog posts" ON public.blog_posts FOR ALL TO authenticated
  USING (can_manage('can_manage_cms')) WITH CHECK (can_manage('can_manage_cms'));

-- TESTIMONIALS
DROP POLICY IF EXISTS "Admins can manage testimonials" ON public.testimonials;
DROP POLICY IF EXISTS "Admins can view all testimonials" ON public.testimonials;
CREATE POLICY "Staff can manage testimonials" ON public.testimonials FOR ALL TO public
  USING (can_manage('can_manage_cms')) WITH CHECK (can_manage('can_manage_cms'));

-- INSTRUCTORS
DROP POLICY IF EXISTS "Admins can manage instructors" ON public.instructors;
CREATE POLICY "Staff can manage instructors" ON public.instructors FOR ALL TO public
  USING (can_manage('can_manage_subject_cms')) WITH CHECK (can_manage('can_manage_subject_cms'));

-- NOTIFICATIONS
DROP POLICY IF EXISTS "Admins can manage notifications" ON public.notifications;
CREATE POLICY "Staff can manage notifications" ON public.notifications FOR ALL TO public
  USING (can_manage('can_manage_students')) WITH CHECK (can_manage('can_manage_students'));

-- STORAGE: Carousel banners
DROP POLICY IF EXISTS "Admins can upload carousel banner images" ON storage.objects;
CREATE POLICY "Staff can upload carousel banner images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'carousel-banners' AND can_manage('can_manage_carousel'));

DROP POLICY IF EXISTS "Admins can update carousel banner images" ON storage.objects;
CREATE POLICY "Staff can update carousel banner images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'carousel-banners' AND can_manage('can_manage_carousel'));

DROP POLICY IF EXISTS "Admins can delete carousel banner images" ON storage.objects;
CREATE POLICY "Staff can delete carousel banner images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'carousel-banners' AND can_manage('can_manage_carousel'));

-- STORAGE: Blog images (also bundle covers)
DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Staff can upload blog images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-images' AND (can_manage('can_manage_cms') OR can_manage('can_manage_subjects')));

DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Staff can update blog images" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'blog-images' AND (can_manage('can_manage_cms') OR can_manage('can_manage_subjects')));

DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Staff can delete blog images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'blog-images' AND (can_manage('can_manage_cms') OR can_manage('can_manage_subjects')));

-- STORAGE: Gallery
DROP POLICY IF EXISTS "Admins can upload gallery images" ON storage.objects;
CREATE POLICY "Staff can upload gallery images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'gallery-images' AND can_manage('can_manage_gallery'));

DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;
CREATE POLICY "Staff can delete gallery images" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'gallery-images' AND can_manage('can_manage_gallery'));

-- STORAGE: PDFs
DROP POLICY IF EXISTS "Admins can upload PDFs" ON storage.objects;
CREATE POLICY "Staff can upload PDFs" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'course-pdfs' AND can_manage('can_manage_pdfs'));

DROP POLICY IF EXISTS "Admins can delete PDFs" ON storage.objects;
CREATE POLICY "Staff can delete PDFs" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'course-pdfs' AND can_manage('can_manage_pdfs'));
