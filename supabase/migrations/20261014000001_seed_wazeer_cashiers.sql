-- ==============================================================================
-- Migration: 20261014000001_seed_wazeer_cashiers.sql
-- Plain SQL script to insert 15 branch cashiers into auth.users, profiles & user_roles
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Insert 15 Cashiers into auth.users (if not already existing)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
SELECT 
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  t.email,
  crypt(t.plain_pass, gen_salt('bf')),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'full_name_ar', t.full_name_ar,
    'branch_code', t.branch_code,
    'role', 'pos_cashier'
  ),
  now(),
  now()
FROM (VALUES
  ('cashier.korba@wazeer-elhelw.com', 'Korba@2026', 'كاشير أحمد سالم (الكوربة)', 'korba'),
  ('cashier.abbas@wazeer-elhelw.com', 'Abbas@2026', 'كاشير محمد فتحي (عباس العقاد)', 'abbas'),
  ('cashier.helmeya@wazeer-elhelw.com', 'Helmeya@2026', 'كاشير خالد سعيد (الحلمية)', 'helmeya'),
  ('cashier.khosoos@wazeer-elhelw.com', 'Khosoos@2026', 'كاشير محمود بدوي (الخصوص)', 'khosoos'),
  ('cashier.downtown@wazeer-elhelw.com', 'Balad@2026', 'كاشير أشرف عثمان (وسط البلد)', 'wost_elbalad'),
  ('cashier.giza@wazeer-elhelw.com', 'Giza@2026', 'كاشير حسام حسن (الجيزة)', 'giza'),
  ('cashier.faisal@wazeer-elhelw.com', 'Faisal@2026', 'كاشير عادل رمزي (فيصل)', 'faisal'),
  ('cashier.darsalam@wazeer-elhelw.com', 'Salam@2026', 'كاشير كرم عبد العظيم (دار السلام)', 'dar_elsalam'),
  ('cashier.october@wazeer-elhelw.com', 'October@2026', 'كاشير أيمن الشاذلي (حدائق أكتوبر)', 'october_gardens'),
  ('cashier.ahram@wazeer-elhelw.com', 'Ahram@2026', 'كاشير ياسر مصطفى (حدائق الأهرام)', 'ahram_gardens'),
  ('cashier.hosary@wazeer-elhelw.com', 'Hosary@2026', 'كاشير عمرو شريف (الحصري)', 'hosary'),
  ('cashier.zayed@wazeer-elhelw.com', 'Zayed@2026', 'كاشير عمر الدسوقي (الشيخ زايد)', 'sheikh_zayed'),
  ('cashier.mansoura@wazeer-elhelw.com', 'Mansoura@2026', 'كاشير سامح التابعي (المنصورة)', 'mansoura'),
  ('cashier.banha@wazeer-elhelw.com', 'Banha@2026', 'كاشير نبيل شكري (بنها)', 'banha'),
  ('cashier.tenth@wazeer-elhelw.com', 'Tenth@2026', 'كاشير طارق سليم (العاشر)', 'tenth_ramadan')
) AS t(email, plain_pass, full_name_ar, branch_code)
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.email = t.email
);

-- Update existing users to fix NULL string tokens and set passwords
UPDATE auth.users
SET 
  encrypted_password = crypt(t.plain_pass, gen_salt('bf')),
  email_confirmed_at = COALESCE(auth.users.email_confirmed_at, now()),
  confirmation_token = COALESCE(auth.users.confirmation_token, ''),
  recovery_token = COALESCE(auth.users.recovery_token, ''),
  email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
  email_change = COALESCE(auth.users.email_change, ''),
  email_change_token_current = COALESCE(auth.users.email_change_token_current, ''),
  reauthentication_token = COALESCE(auth.users.reauthentication_token, ''),
  is_sso_user = COALESCE(auth.users.is_sso_user, false),
  raw_user_meta_data = jsonb_build_object(
    'full_name_ar', t.full_name_ar,
    'branch_code', t.branch_code,
    'role', 'pos_cashier'
  ),
  updated_at = now()
FROM (VALUES
  ('cashier.korba@wazeer-elhelw.com', 'Korba@2026', 'كاشير أحمد سالم (الكوربة)', 'korba'),
  ('cashier.abbas@wazeer-elhelw.com', 'Abbas@2026', 'كاشير محمد فتحي (عباس العقاد)', 'abbas'),
  ('cashier.helmeya@wazeer-elhelw.com', 'Helmeya@2026', 'كاشير خالد سعيد (الحلمية)', 'helmeya'),
  ('cashier.khosoos@wazeer-elhelw.com', 'Khosoos@2026', 'كاشير محمود بدوي (الخصوص)', 'khosoos'),
  ('cashier.downtown@wazeer-elhelw.com', 'Balad@2026', 'كاشير أشرف عثمان (وسط البلد)', 'wost_elbalad'),
  ('cashier.giza@wazeer-elhelw.com', 'Giza@2026', 'كاشير حسام حسن (الجيزة)', 'giza'),
  ('cashier.faisal@wazeer-elhelw.com', 'Faisal@2026', 'كاشير عادل رمزي (فيصل)', 'faisal'),
  ('cashier.darsalam@wazeer-elhelw.com', 'Salam@2026', 'كاشير كرم عبد العظيم (دار السلام)', 'dar_elsalam'),
  ('cashier.october@wazeer-elhelw.com', 'October@2026', 'كاشير أيمن الشاذلي (حدائق أكتوبر)', 'october_gardens'),
  ('cashier.ahram@wazeer-elhelw.com', 'Ahram@2026', 'كاشير ياسر مصطفى (حدائق الأهرام)', 'ahram_gardens'),
  ('cashier.hosary@wazeer-elhelw.com', 'Hosary@2026', 'كاشير عمرو شريف (الحصري)', 'hosary'),
  ('cashier.zayed@wazeer-elhelw.com', 'Zayed@2026', 'كاشير عمر الدسوقي (الشيخ زايد)', 'sheikh_zayed'),
  ('cashier.mansoura@wazeer-elhelw.com', 'Mansoura@2026', 'كاشير سامح التابعي (المنصورة)', 'mansoura'),
  ('cashier.banha@wazeer-elhelw.com', 'Banha@2026', 'كاشير نبيل شكري (بنها)', 'banha'),
  ('cashier.tenth@wazeer-elhelw.com', 'Tenth@2026', 'كاشير طارق سليم (العاشر)', 'tenth_ramadan')
) AS t(email, plain_pass, full_name_ar, branch_code)
WHERE auth.users.email = t.email;

-- 2. Populate public.profiles
INSERT INTO public.profiles (id, email, full_name_ar, full_name_en, is_active)
SELECT 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name_ar', u.email),
  'POS Cashier',
  true
FROM auth.users u
WHERE u.email IN (
  'cashier.korba@wazeer-elhelw.com',
  'cashier.abbas@wazeer-elhelw.com',
  'cashier.helmeya@wazeer-elhelw.com',
  'cashier.khosoos@wazeer-elhelw.com',
  'cashier.downtown@wazeer-elhelw.com',
  'cashier.giza@wazeer-elhelw.com',
  'cashier.faisal@wazeer-elhelw.com',
  'cashier.darsalam@wazeer-elhelw.com',
  'cashier.october@wazeer-elhelw.com',
  'cashier.ahram@wazeer-elhelw.com',
  'cashier.hosary@wazeer-elhelw.com',
  'cashier.zayed@wazeer-elhelw.com',
  'cashier.mansoura@wazeer-elhelw.com',
  'cashier.banha@wazeer-elhelw.com',
  'cashier.tenth@wazeer-elhelw.com'
)
ON CONFLICT (id) DO UPDATE SET
  full_name_ar = EXCLUDED.full_name_ar,
  email = EXCLUDED.email,
  is_active = true,
  updated_at = now();

-- 3. Populate public.user_roles (pos_cashier) without ON CONFLICT dependency
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'pos_cashier'::public.app_role
FROM auth.users u
WHERE u.email IN (
  'cashier.korba@wazeer-elhelw.com',
  'cashier.abbas@wazeer-elhelw.com',
  'cashier.helmeya@wazeer-elhelw.com',
  'cashier.khosoos@wazeer-elhelw.com',
  'cashier.downtown@wazeer-elhelw.com',
  'cashier.giza@wazeer-elhelw.com',
  'cashier.faisal@wazeer-elhelw.com',
  'cashier.darsalam@wazeer-elhelw.com',
  'cashier.october@wazeer-elhelw.com',
  'cashier.ahram@wazeer-elhelw.com',
  'cashier.hosary@wazeer-elhelw.com',
  'cashier.zayed@wazeer-elhelw.com',
  'cashier.mansoura@wazeer-elhelw.com',
  'cashier.banha@wazeer-elhelw.com',
  'cashier.tenth@wazeer-elhelw.com'
)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = u.id AND ur.role = 'pos_cashier'::public.app_role
);
