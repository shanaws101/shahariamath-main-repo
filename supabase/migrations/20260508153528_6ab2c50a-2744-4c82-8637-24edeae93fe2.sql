-- Facebook Group join request tracking (self-reported)
CREATE TABLE public.facebook_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  student_note TEXT,
  admin_note TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id)
);

ALTER TABLE public.facebook_join_requests ENABLE ROW LEVEL SECURITY;

-- Status check via trigger (avoid CHECK with non-immutable contexts)
CREATE OR REPLACE FUNCTION public.validate_fb_join_status()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.status NOT IN ('pending','approved','rejected') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER fb_join_validate
BEFORE INSERT OR UPDATE ON public.facebook_join_requests
FOR EACH ROW EXECUTE FUNCTION public.validate_fb_join_status();

-- Students manage own requests, but cannot set status to approved/rejected
CREATE POLICY "Users view own fb requests" ON public.facebook_join_requests
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own fb requests" ON public.facebook_join_requests
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.user_id = auth.uid()
      AND e.subject_id = facebook_join_requests.subject_id
      AND e.payment_status = 'completed'
  )
);

CREATE POLICY "Users update own fb requests note" ON public.facebook_join_requests
FOR UPDATE USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Staff manage fb requests" ON public.facebook_join_requests
FOR ALL USING (can_manage('can_manage_students'::text))
WITH CHECK (can_manage('can_manage_students'::text));

CREATE INDEX idx_fb_join_user ON public.facebook_join_requests(user_id);
CREATE INDEX idx_fb_join_status ON public.facebook_join_requests(status);