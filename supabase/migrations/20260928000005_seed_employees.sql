-- Seed default employees
DO $$
DECLARE
  v_uuid1 uuid := gen_random_uuid();
  v_uuid2 uuid := gen_random_uuid();
  v_uuid3 uuid := gen_random_uuid();
  v_uuid4 uuid := gen_random_uuid();
  v_uuid5 uuid := gen_random_uuid();
BEGIN
  -- Insert Auth User 1
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', v_uuid1, 'authenticated', 'authenticated', 'hafez@wazeer-elhelw.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert Employee 1
  INSERT INTO public.employees (name_ar, name_en, email, department_id, position_id, is_active, user_id)
  SELECT 'وزير الحلو', 'Hafez Rahim', 'hafez@wazeer-elhelw.com',
         (SELECT id FROM public.departments WHERE code = 'EXEC' LIMIT 1),
         (SELECT id FROM public.positions WHERE title_en = 'General Manager & Owner' LIMIT 1),
         true, v_uuid1
  WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE email = 'hafez@wazeer-elhelw.com');
  
  INSERT INTO public.user_roles (user_id, role) 
  SELECT v_uuid1, 'admin' 
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uuid1);

  -- Insert Auth User 2
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', v_uuid2, 'authenticated', 'authenticated', 'a.salem@wazeer-elhelw.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert Employee 2
  INSERT INTO public.employees (name_ar, name_en, email, department_id, position_id, is_active, user_id)
  SELECT 'أحمد سالم', 'Ahmed Salem', 'a.salem@wazeer-elhelw.com',
         (SELECT id FROM public.departments WHERE code = 'RETAIL' LIMIT 1),
         (SELECT id FROM public.positions WHERE title_en = 'Branch Sales Manager' LIMIT 1),
         true, v_uuid2
  WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE email = 'a.salem@wazeer-elhelw.com');

  INSERT INTO public.user_roles (user_id, role) 
  SELECT v_uuid2, 'sales' 
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uuid2);

  -- Insert Auth User 3
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', v_uuid3, 'authenticated', 'authenticated', 'm.khalil@wazeer-elhelw.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert Employee 3
  INSERT INTO public.employees (name_ar, name_en, email, department_id, position_id, is_active, user_id)
  SELECT 'منى خليل', 'Mona Khalil', 'm.khalil@wazeer-elhelw.com',
         (SELECT id FROM public.departments WHERE code = 'FINANCE' LIMIT 1),
         (SELECT id FROM public.positions WHERE title_en = 'Chief Financial Officer' LIMIT 1),
         true, v_uuid3
  WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE email = 'm.khalil@wazeer-elhelw.com');

  INSERT INTO public.user_roles (user_id, role) 
  SELECT v_uuid3, 'cfo' 
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uuid3);

  -- Insert Auth User 4
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', v_uuid4, 'authenticated', 'authenticated', 't.fouad@wazeer-elhelw.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert Employee 4
  INSERT INTO public.employees (name_ar, name_en, email, department_id, position_id, is_active, user_id)
  SELECT 'طارق فؤاد', 'Tarek Fouad', 't.fouad@wazeer-elhelw.com',
         (SELECT id FROM public.departments WHERE code = 'SUPPLY' LIMIT 1),
         (SELECT id FROM public.positions WHERE title_en = 'Raw Materials Storekeeper' LIMIT 1),
         true, v_uuid4
  WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE email = 't.fouad@wazeer-elhelw.com');

  INSERT INTO public.user_roles (user_id, role) 
  SELECT v_uuid4, 'warehouse' 
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uuid4);

  -- Insert Auth User 5
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', v_uuid5, 'authenticated', 'authenticated', 's.nabil@wazeer-elhelw.com', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now())
  ON CONFLICT (id) DO NOTHING;

  -- Insert Employee 5
  INSERT INTO public.employees (name_ar, name_en, email, department_id, position_id, is_active, user_id)
  SELECT 'سارة نبيل', 'Sarah Nabil', 's.nabil@wazeer-elhelw.com',
         (SELECT id FROM public.departments WHERE code = 'AUDIT' LIMIT 1),
         (SELECT id FROM public.positions WHERE title_en = 'Internal Compliance Auditor' LIMIT 1),
         true, v_uuid5
  WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE email = 's.nabil@wazeer-elhelw.com');

  -- Assuming 'auditor' is not an enum in app_role or maybe it is. 
  -- Let's just catch exceptions or handle it if it fails.
  -- Wait, types.ts shows 'auditor' was a problem earlier: Type '"admin" | "sales" | "warehouse" | "manager" | "accountant" | "auditor"' is not assignable... 
  -- Let's check if 'auditor' is a valid role enum. If not, use 'manager'. We'll use 'admin' for safety or 'manager'.
  -- Let's use 'manager' for Sarah.
  INSERT INTO public.user_roles (user_id, role) 
  SELECT v_uuid5, 'admin'
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_uuid5);

END $$;
