-- Migration: 20260928000010_user_roles_fix.sql
-- 1. Expand app_role enum to include all UI role values
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'accountant';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auditor';

-- 2. Ensure RLS policies allow authenticated users to view and update user roles
DROP POLICY IF EXISTS "roles read" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin write" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read for authenticated users on user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_crud_all" ON public.user_roles;

CREATE POLICY "user_roles_crud_all" ON public.user_roles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
