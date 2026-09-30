-- Migration: 20260929000001_add_pos_cashier_role_and_user.sql
-- Description: Add pos_cashier role to app_role enum and setup RLS policies

-- 1. Expand app_role enum to include pos_cashier and ensure pgcrypto is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pos_cashier';

-- 2. Ensure RLS policies allow reading and writing org entities
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
CREATE POLICY "user_roles_select_all" ON public.user_roles FOR SELECT USING (true);

DROP POLICY IF EXISTS "departments_select_all" ON public.departments;
CREATE POLICY "departments_select_all" ON public.departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "positions_select_all" ON public.positions;
CREATE POLICY "positions_select_all" ON public.positions FOR SELECT USING (true);

DROP POLICY IF EXISTS "employees_select_all" ON public.employees;
CREATE POLICY "employees_select_all" ON public.employees FOR SELECT USING (true);
