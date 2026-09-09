-- Add SSC and HSC to the department enum
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'ssc';
ALTER TYPE public.department ADD VALUE IF NOT EXISTS 'hsc';