-- Migration: 20260928000009_org_crud_support.sql
-- Enable full CRUD operations for Users (profiles), Departments, and Positions

-- Ensure profiles id can be auto-generated
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Relax strict auth.users FK so admin can create profiles directly if auth creation is separate
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure level and code exist on positions
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS level text DEFAULT 'staff';
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS code text;

-- Full CRUD RLS policies for departments
DROP POLICY IF EXISTS "Enable all for authenticated users on departments" ON public.departments;
DROP POLICY IF EXISTS "departments_crud_all" ON public.departments;
CREATE POLICY "departments_crud_all" ON public.departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Full CRUD RLS policies for positions
DROP POLICY IF EXISTS "Enable all for authenticated users on positions" ON public.positions;
DROP POLICY IF EXISTS "positions_crud_all" ON public.positions;
CREATE POLICY "positions_crud_all" ON public.positions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Full CRUD RLS policies for profiles
DROP POLICY IF EXISTS "authenticated_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_crud_all" ON public.profiles;
CREATE POLICY "profiles_crud_all" ON public.profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Full CRUD RLS policies for user_roles
DROP POLICY IF EXISTS "Enable read for authenticated users on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "roles read" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin write" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_crud_all" ON public.user_roles;
CREATE POLICY "user_roles_crud_all" ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
