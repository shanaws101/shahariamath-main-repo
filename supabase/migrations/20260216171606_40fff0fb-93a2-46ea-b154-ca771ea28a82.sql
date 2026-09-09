
-- Trigger: Auto-activate employee when user signs up
-- Matches employees by invited_email, sets status=active, assigns employee role
CREATE OR REPLACE FUNCTION public.handle_employee_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Check if this email was invited as employee
  SELECT id INTO emp_record
  FROM public.employees
  WHERE invited_email = NEW.email AND status = 'invited';

  IF FOUND THEN
    -- Activate employee
    UPDATE public.employees
    SET user_id = NEW.id, status = 'active'
    WHERE id = emp_record.id;

    -- Assign employee role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'employee')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  -- Check for pending referral conversions (cookie-based)
  -- This is handled client-side via pending_referrals table

  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users on insert
CREATE TRIGGER on_auth_user_created_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_employee_signup();
