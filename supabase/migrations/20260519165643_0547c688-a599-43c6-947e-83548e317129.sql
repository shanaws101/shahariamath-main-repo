-- 1) Testimonials: add screenshot_url for uploaded message screenshots
ALTER TABLE public.testimonials
  ADD COLUMN IF NOT EXISTS screenshot_url text;

-- 2) Employees: let admins and active super_admins see all employees
DROP POLICY IF EXISTS "Admins and super admins view employees" ON public.employees;
CREATE POLICY "Admins and super admins view employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e2
      WHERE e2.user_id = auth.uid()
        AND e2.status = 'active'
        AND e2.sub_role = 'super_admin'
    )
  );

-- 3) employee_permissions: let admins and active super_admins read every row
DROP POLICY IF EXISTS "Admins and super admins view permissions" ON public.employee_permissions;
CREATE POLICY "Admins and super admins view permissions"
  ON public.employee_permissions
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.employees e2
      WHERE e2.user_id = auth.uid()
        AND e2.status = 'active'
        AND e2.sub_role = 'super_admin'
    )
  );