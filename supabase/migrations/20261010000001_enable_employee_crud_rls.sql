-- ==============================================================================
-- Migration: 20261010000001_enable_employee_crud_rls.sql
-- Description: Enable full CRUD operations on public.employees table
-- ==============================================================================

-- 1. Ensure columns exist and have appropriate defaults
ALTER TABLE public.employees ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS national_id text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS code text;

-- 2. Relax foreign key constraints if needed
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_department_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_position_id_fkey;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_user_id_fkey;

-- 3. Enable RLS and create open policy matching branches and products
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_all_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_select_all" ON public.employees;
DROP POLICY IF EXISTS "HR read all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees read own profile" ON public.employees;
DROP POLICY IF EXISTS "read for authenticated" ON public.employees;
DROP POLICY IF EXISTS "insert for authenticated" ON public.employees;
DROP POLICY IF EXISTS "update for authenticated" ON public.employees;

CREATE POLICY "employees_all_policy" ON public.employees
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Grant table privileges to anon, authenticated and service_role
GRANT ALL ON public.employees TO anon, authenticated, service_role;
GRANT ALL ON public.departments TO anon, authenticated, service_role;
GRANT ALL ON public.positions TO anon, authenticated, service_role;
