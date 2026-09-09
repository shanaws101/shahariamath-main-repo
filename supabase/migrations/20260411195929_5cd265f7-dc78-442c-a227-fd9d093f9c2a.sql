
CREATE OR REPLACE FUNCTION public.handle_employee_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  emp_record RECORD;
BEGIN
  -- Check if this email was invited as employee
  SELECT id, sub_role INTO emp_record
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

    -- If super_admin, also assign admin role for full access
    IF emp_record.sub_role = 'super_admin' THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger (drop + create to ensure it uses updated function)
DROP TRIGGER IF EXISTS on_auth_user_created_employee ON auth.users;
CREATE TRIGGER on_auth_user_created_employee
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_employee_signup();
