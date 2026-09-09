
-- Set reasonable prices for all subjects
-- BBA subjects: ৳500 per subject
UPDATE public.subjects SET price = 500 WHERE course_type = 'BBA';

-- MBA subjects: ৳800 per subject
UPDATE public.subjects SET price = 800 WHERE course_type = 'MBA';

-- Job Preparation: ৳300 per subject
UPDATE public.subjects SET price = 300 WHERE course_type = 'Job Preparation';

-- Statistics Courses: ৳400 per subject
UPDATE public.subjects SET price = 400 WHERE course_type = 'Statistics Courses';

-- BSS Honours: ৳400 per subject
UPDATE public.subjects SET price = 400 WHERE course_type = 'BSS (Honours)';

-- Honours: ৳350 per subject
UPDATE public.subjects SET price = 350 WHERE course_type = 'Honours';
