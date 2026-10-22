-- ==============================================================================
-- Migration: 20261022000002_seed_it_technicians_departments_and_positions.sql
-- Description: Seed IT, Maintenance, Helpdesk, and HR Departments & Positions
--              including specialized technician roles (IT Tech, POS Tech, Kitchen Tech).
-- ==============================================================================

-- 1. Insert or update core and technical departments
INSERT INTO public.departments (code, name_ar, name_en)
VALUES
  ('IT', 'تقنية المعلومات والدعم الفني', 'IT & Technical Support'),
  ('MAINT', 'التشغيل والصيانة الفنية', 'Operations & Technical Maintenance'),
  ('SUPPORT', 'خدمة العملاء ومكتب المساعدة', 'Help Desk & Customer Care'),
  ('HR', 'الموارد البشرية والشؤون الإدارية', 'Human Resources & Administration'),
  ('EXEC', 'الإدارة التنفيذية والعامة', 'Executive Management'),
  ('RETAIL', 'المبيعات ونقاط البيع والفروع', 'Sales, POS & Branches'),
  ('KITCHEN', 'المطبخ المركزي والتصنيع', 'Central Kitchen & Production'),
  ('SUPPLY', 'سلاسل الإمداد والمخازن', 'Supply Chain & Warehousing'),
  ('FINANCE', 'الإدارة المالية والحسابات', 'Finance & Accounting'),
  ('AUDIT', 'الجودة والرقابة الداخلية', 'Quality Control & Audit')
ON CONFLICT (code) DO UPDATE
SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  updated_at = now();

-- 2. Insert or update technical and organizational positions
WITH dept_map AS (
  SELECT id, code FROM public.departments
)
INSERT INTO public.positions (code, title_ar, title_en, department_id)
VALUES
  -- IT & Technical Support
  ('IT-01', 'مدير تقنية المعلومات ونظم ERP', 'IT & ERP Director', (SELECT id FROM dept_map WHERE code = 'IT')),
  ('IT-02', 'فني دعم فني وشبكات (IT Support Tech)', 'IT Support & Networks Technician', (SELECT id FROM dept_map WHERE code = 'IT')),
  ('IT-03', 'فني أجهزة نقاط البيع وكاشير (POS Hardware Tech)', 'POS Hardware Technician', (SELECT id FROM dept_map WHERE code = 'IT')),
  ('IT-04', 'أخصائي نظم وقواعد بيانات (System Admin)', 'ERP & Database Administrator', (SELECT id FROM dept_map WHERE code = 'IT')),

  -- Maintenance & Field Operations
  ('MNT-01', 'مدير التشغيل والصيانة الفنية', 'Technical Maintenance Manager', (SELECT id FROM dept_map WHERE code = 'MAINT')),
  ('MNT-02', 'فني تبريد وأفران مطبخ مركزي (Kitchen Technician)', 'Kitchen & Refrigeration Technician', (SELECT id FROM dept_map WHERE code = 'MAINT')),
  ('MNT-03', 'فني كهرباء ومعدات فروع (Electrical Technician)', 'Electrical & Facilities Technician', (SELECT id FROM dept_map WHERE code = 'MAINT')),

  -- Help Desk & Customer Support
  ('SUP-01', 'أخصائي مكتب مساعدة ودعم فني (Help Desk Specialist)', 'Help Desk Support Specialist', (SELECT id FROM dept_map WHERE code = 'SUPPORT')),
  ('SUP-02', 'ممثل خدمة عملاء وبلاغات طارئة', 'Customer Care Representative', (SELECT id FROM dept_map WHERE code = 'SUPPORT')),

  -- HR & Administration
  ('HR-01', 'مدير الموارد البشرية والشؤون الإدارية', 'Human Resources Manager', (SELECT id FROM dept_map WHERE code = 'HR')),
  ('HR-02', 'أخصائي شؤون موظفين ورواتب', 'HR & Payroll Specialist', (SELECT id FROM dept_map WHERE code = 'HR')),

  -- Retail, Kitchen, Finance, Quality
  ('EXEC-01', 'المدير العام والمالك', 'General Manager & Owner', (SELECT id FROM dept_map WHERE code = 'EXEC')),
  ('FIN-01', 'المدير المالي ورئيس الحسابات', 'Chief Financial Officer', (SELECT id FROM dept_map WHERE code = 'FINANCE')),
  ('FIN-02', 'محاسب تكاليف وفروع', 'Branch & Cost Accountant', (SELECT id FROM dept_map WHERE code = 'FINANCE')),
  ('KIT-01', 'الشيف التنفيذي لحلويات الوزير', 'Executive Pastry Chef', (SELECT id FROM dept_map WHERE code = 'KITCHEN')),
  ('RET-01', 'مدير فرع ونقاط بيع', 'Branch Sales Manager', (SELECT id FROM dept_map WHERE code = 'RETAIL')),
  ('RET-02', 'كاشير ومسؤول بيع فوري', 'Retail Cashier & Sales Rep', (SELECT id FROM dept_map WHERE code = 'RETAIL')),
  ('QC-01', 'مراجع داخلي ورقابة جودة', 'Internal Compliance Auditor', (SELECT id FROM dept_map WHERE code = 'AUDIT'))
ON CONFLICT (code) DO UPDATE
SET
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  department_id = EXCLUDED.department_id,
  updated_at = now();

-- 3. Insert or update core company branches
INSERT INTO public.branches (
  code, name_ar, name_en, manager_name, email, city, is_wazeer_owned, is_active
) VALUES 
  ('RUH-01', 'الفرع الرئيسي - الرياض', 'Main Branch - Riyadh', 'م. فهد القحطاني', 'ruh-main@wazeer-elhelw.com', 'الرياض', true, true),
  ('JED-01', 'فرع جدة - طريق الملك', 'Jeddah Branch - King Rd', 'أحمد الغامدي', 'jeddah@wazeer-elhelw.com', 'جدة', true, true),
  ('DMM-01', 'فرع الدمام - الكورنيش', 'Dammam Branch - Corniche', 'سعود الدوسري', 'dammam@wazeer-elhelw.com', 'الدمام', true, true),
  ('KHB-01', 'فرع الخبر', 'Khobar Branch', 'محمد الشهري', 'khobar@wazeer-elhelw.com', 'الخبر', true, true),
  ('korba', 'فرع الكوربة — مصر الجديدة', 'Korba — Heliopolis Branch', 'أحمد سالم', 'korba@wazeer-elhelw.com', 'القاهرة', true, true),
  ('maadi', 'فرع المعادي — شارع النصر', 'Maadi — Al-Nasr St. Branch', 'كريم ممدوح', 'maadi@wazeer-elhelw.com', 'القاهرة', true, true),
  ('tagamoa', 'فرع التجمع الخامس — شارع التسعين', '5th Settlement — 90th St. Branch', 'طارق الشناوي', 'tagamoa@wazeer-elhelw.com', 'القاهرة الجديدة', true, true),
  ('central_kitchen', 'المطبخ المركزي ومصنع الحلويات — العاشر من رمضان', 'Central Kitchen & Pastry Factory — 10th of Ramadan', 'محمود الشريف', 'kitchen@wazeer-elhelw.com', 'العاشر من رمضان', true, true)
ON CONFLICT (code) DO UPDATE
SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  manager_name = COALESCE(EXCLUDED.manager_name, public.branches.manager_name),
  email = COALESCE(EXCLUDED.email, public.branches.email),
  city = COALESCE(EXCLUDED.city, public.branches.city),
  is_wazeer_owned = EXCLUDED.is_wazeer_owned,
  is_active = EXCLUDED.is_active,
  updated_at = now();
