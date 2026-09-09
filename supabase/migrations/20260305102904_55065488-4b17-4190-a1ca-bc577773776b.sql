
-- SMS Templates table
CREATE TABLE public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms templates" ON public.sms_templates FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add scheduled_for to sms_campaigns
ALTER TABLE public.sms_campaigns ADD COLUMN scheduled_for TIMESTAMPTZ DEFAULT NULL;
