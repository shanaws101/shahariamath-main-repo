-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create departments enum
CREATE TYPE public.department AS ENUM ('management', 'marketing', 'accounting', 'finance', 'economics');

-- Create class status enum
CREATE TYPE public.class_status AS ENUM ('upcoming', 'live', 'finished', 'cancelled');

-- Create payment status enum
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    student_id TEXT UNIQUE,
    department department,
    year INTEGER CHECK (year >= 1 AND year <= 4),
    is_blocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    description_bn TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    compatible_years INTEGER[] DEFAULT ARRAY[1,2,3,4],
    is_visible BOOLEAN DEFAULT true,
    icon TEXT,
    facebook_group_url TEXT,
    whatsapp_support_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enrollments table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    payment_status payment_status DEFAULT 'pending',
    payment_id UUID,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, subject_id)
);

-- Create class_schedules table
CREATE TABLE public.class_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    description TEXT,
    description_bn TEXT,
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_free BOOLEAN DEFAULT false,
    status class_status DEFAULT 'upcoming',
    stream_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create free_videos table
CREATE TABLE public.free_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    description TEXT,
    description_bn TEXT,
    youtube_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status payment_status DEFAULT 'pending',
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    title_bn TEXT,
    message TEXT NOT NULL,
    message_bn TEXT,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_id_counter table for generating sequential IDs
CREATE TABLE public.student_id_counter (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    current_count INTEGER NOT NULL DEFAULT 0,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM now())
);

-- Insert initial counter
INSERT INTO public.student_id_counter (id, current_count, year) VALUES (1, 0, 2026);

-- Create cms_content table for landing page CMS
CREATE TABLE public.cms_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section TEXT NOT NULL UNIQUE,
    content JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create testimonials table
CREATE TABLE public.testimonials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_bn TEXT,
    role TEXT,
    role_bn TEXT,
    content TEXT NOT NULL,
    content_bn TEXT,
    avatar_url TEXT,
    is_visible BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_id_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to generate student ID
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_count INTEGER;
    current_year INTEGER;
BEGIN
    SELECT year INTO current_year FROM student_id_counter WHERE id = 1;
    UPDATE student_id_counter SET current_count = current_count + 1 WHERE id = 1 RETURNING current_count INTO new_count;
    RETURN 'OSA-' || current_year || '-' || LPAD(new_count::TEXT, 6, '0');
END;
$$;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON public.subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_class_schedules_updated_at BEFORE UPDATE ON public.class_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cms_content_updated_at BEFORE UPDATE ON public.cms_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for subjects (public read)
CREATE POLICY "Anyone can view visible subjects" ON public.subjects FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can view all subjects" ON public.subjects FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for enrollments
CREATE POLICY "Users can view their own enrollments" ON public.enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all enrollments" ON public.enrollments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can create their own enrollments" ON public.enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage enrollments" ON public.enrollments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for class_schedules
CREATE POLICY "Anyone can view free classes" ON public.class_schedules FOR SELECT USING (is_free = true);
CREATE POLICY "Enrolled users can view paid classes" ON public.class_schedules FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.enrollments e 
        WHERE e.user_id = auth.uid() 
        AND e.subject_id = class_schedules.subject_id
        AND e.payment_status = 'completed'
    )
);
CREATE POLICY "Admins can view all classes" ON public.class_schedules FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage class schedules" ON public.class_schedules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for free_videos (public read for visible)
CREATE POLICY "Anyone can view visible free videos" ON public.free_videos FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can view all free videos" ON public.free_videos FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage free videos" ON public.free_videos FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for payments
CREATE POLICY "Users can view their own payments" ON public.payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all payments" ON public.payments FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for student_id_counter (only via function)
CREATE POLICY "No direct access to counter" ON public.student_id_counter FOR SELECT USING (false);

-- RLS Policies for cms_content (public read)
CREATE POLICY "Anyone can view CMS content" ON public.cms_content FOR SELECT USING (true);
CREATE POLICY "Admins can manage CMS content" ON public.cms_content FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for testimonials (public read for visible)
CREATE POLICY "Anyone can view visible testimonials" ON public.testimonials FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins can view all testimonials" ON public.testimonials FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_student_id ON public.profiles(student_id);
CREATE INDEX idx_enrollments_user_id ON public.enrollments(user_id);
CREATE INDEX idx_enrollments_subject_id ON public.enrollments(subject_id);
CREATE INDEX idx_class_schedules_subject_id ON public.class_schedules(subject_id);
CREATE INDEX idx_class_schedules_date ON public.class_schedules(scheduled_date);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_payments_user_id ON public.payments(user_id);