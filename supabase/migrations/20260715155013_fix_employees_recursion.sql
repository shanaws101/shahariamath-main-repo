-- 1. Create a security definer function to check if a user is a super_admin without triggering RLS policies
CREATE OR REPLACE FUNCTION public.is_super_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = check_user_id
      AND status = 'active'
      AND sub_role = 'super_admin'
  );
$$;

-- 2. Drop the recursive policies
DROP POLICY IF EXISTS "Admins and super admins view employees" ON public.employees;
DROP POLICY IF EXISTS "Staff can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Admins and super admins view permissions" ON public.employee_permissions;
DROP POLICY IF EXISTS "Staff can manage permissions" ON public.employee_permissions;

-- 3. Recreate the policies using the new security definer function to avoid infinite recursion

-- Employees table
CREATE POLICY "Staff can manage employees"
  ON public.employees FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );

-- Employee permissions table
CREATE POLICY "Staff can manage permissions"
  ON public.employee_permissions FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR public.is_super_admin(auth.uid())
  );
