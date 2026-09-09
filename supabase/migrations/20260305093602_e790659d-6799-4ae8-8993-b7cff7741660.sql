
CREATE TABLE public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  recipient_filter jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamp with time zone,
  sent_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms campaigns"
  ON public.sms_campaigns FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
