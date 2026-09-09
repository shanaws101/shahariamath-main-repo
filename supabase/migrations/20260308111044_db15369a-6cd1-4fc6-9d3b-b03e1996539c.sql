-- Fix security definer view by setting it to SECURITY INVOKER
ALTER VIEW public.referral_click_summaries SET (security_invoker = on);
ALTER VIEW public.public_discount_codes SET (security_invoker = on);