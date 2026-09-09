
-- ============================================
-- EMPLOYEES TABLE
-- ============================================
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active')),
  invited_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage employees" ON public.employees
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own record" ON public.employees
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- EMPLOYEE PERMISSIONS TABLE
-- ============================================
CREATE TABLE public.employee_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE,
  can_view_revenue boolean NOT NULL DEFAULT false,
  can_view_clicks boolean NOT NULL DEFAULT true,
  can_view_signups boolean NOT NULL DEFAULT true,
  can_view_enrollments boolean NOT NULL DEFAULT false
);

ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage permissions" ON public.employee_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Employees can view own permissions" ON public.employee_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_permissions.employee_id
        AND e.user_id = auth.uid()
    )
  );

-- ============================================
-- EXTEND CLASS_SCHEDULES WITH DEPARTMENT/YEAR FILTERING
-- ============================================
ALTER TABLE public.class_schedules
  ADD COLUMN IF NOT EXISTS department text DEFAULT NULL
    CHECK (department IS NULL OR department IN ('management', 'marketing', 'accounting', 'finance', 'economics')),
  ADD COLUMN IF NOT EXISTS target_years integer[] DEFAULT ARRAY[1,2,3,4];

-- Update RLS: students can view events matching their department/year
CREATE POLICY "Students can view matching calendar events"
  ON public.class_schedules
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
        AND (
          class_schedules.department IS NULL
          OR class_schedules.department::text = p.department::text
        )
        AND (
          class_schedules.target_years IS NULL
          OR p.year = ANY(class_schedules.target_years)
        )
    )
  );
