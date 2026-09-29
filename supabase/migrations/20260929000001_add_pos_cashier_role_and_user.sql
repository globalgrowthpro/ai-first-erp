-- Migration: 20260929000001_add_pos_cashier_role_and_user.sql
-- Description: Add pos_cashier role to app_role enum and seed dedicated POS Cashier user

-- 1. Expand app_role enum to include pos_cashier
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

-- 3. Seed POS Cashier user in auth.users, profiles, user_roles, and employees
DO $$
DECLARE
  v_cashier_id uuid := 'c0000000-0000-0000-0000-000000000001'::uuid;
  v_dept_id uuid;
  v_pos_id uuid;
BEGIN
  -- Ensure RETAIL department exists
  SELECT id INTO v_dept_id FROM public.departments WHERE code = 'RETAIL' LIMIT 1;
  IF v_dept_id IS NULL THEN
    INSERT INTO public.departments (code, name_ar, name_en)
    VALUES ('RETAIL', 'المبيعات ونقاط البيع والفروع', 'Sales, POS & Branches')
    RETURNING id INTO v_dept_id;
  END IF;

  -- Ensure POS Cashier position exists
  SELECT id INTO v_pos_id FROM public.positions WHERE title_en = 'Retail Cashier & Sales Rep' LIMIT 1;
  IF v_pos_id IS NULL THEN
    INSERT INTO public.positions (title_ar, title_en, department_id, level, code)
    VALUES ('كاشير ومسؤول بيع فوري', 'Retail Cashier & Sales Rep', v_dept_id, 'staff', 'POS-CASH')
    RETURNING id INTO v_pos_id;
  END IF;

  -- Insert/Update in auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_cashier_id,
    'authenticated',
    'authenticated',
    'cashier@wazeer-elhelw.com',
    crypt('Pos@123456', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name_ar":"كاشير نقطة البيع","full_name_en":"POS Cashier"}',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    encrypted_password = crypt('Pos@123456', gen_salt('bf')),
    email_confirmed_at = now(),
    updated_at = now();

  -- Insert/Update in public.profiles
  INSERT INTO public.profiles (
    id,
    full_name_ar,
    full_name_en,
    email,
    department_id,
    position_id,
    sidebar_visible,
    is_active,
    updated_at
  )
  VALUES (
    v_cashier_id,
    'كاشير نقطة البيع',
    'POS Cashier',
    'cashier@wazeer-elhelw.com',
    v_dept_id,
    v_pos_id,
    false,
    true,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name_ar = 'كاشير نقطة البيع',
    full_name_en = 'POS Cashier',
    email = 'cashier@wazeer-elhelw.com',
    department_id = v_dept_id,
    position_id = v_pos_id,
    sidebar_visible = false,
    is_active = true,
    updated_at = now();

  -- Insert/Update in public.user_roles
  DELETE FROM public.user_roles WHERE user_id = v_cashier_id;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_cashier_id, 'pos_cashier');

  -- Insert/Update in public.employees
  DELETE FROM public.employees WHERE email = 'cashier@wazeer-elhelw.com' OR user_id = v_cashier_id;
  INSERT INTO public.employees (
    name_ar,
    name_en,
    email,
    department_id,
    position_id,
    is_active,
    user_id
  )
  VALUES (
    'كاشير نقطة البيع',
    'POS Cashier',
    'cashier@wazeer-elhelw.com',
    v_dept_id,
    v_pos_id,
    true,
    v_cashier_id
  );

END $$;
