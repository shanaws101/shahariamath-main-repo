-- Fix employees table RLS: allow super_admin employees to see/manage employees
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
CREATE POLICY "Staff can manage employees"
  ON public.employees FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.status = 'active'
        AND e.sub_role = 'super_admin'
    )
  );

-- Fix employee_permissions table RLS: allow super_admin employees to manage permissions
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.employee_permissions;
CREATE POLICY "Staff can manage permissions"
  ON public.employee_permissions FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM employees e
      WHERE e.user_id = auth.uid()
        AND e.status = 'active'
        AND e.sub_role = 'super_admin'
    )
  );
