-- Seed default org structure
DO $$
BEGIN
  INSERT INTO public.departments (code, name_ar, name_en)
  VALUES ('EXEC', 'الإدارة التنفيذية والعامة', 'Executive Management')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.departments (code, name_ar, name_en)
  VALUES ('RETAIL', 'المبيعات ونقاط البيع والفروع', 'Sales, POS & Branches')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.departments (code, name_ar, name_en)
  VALUES ('KITCHEN', 'المطبخ المركزي والتصنيع', 'Central Kitchen & Production')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.departments (code, name_ar, name_en)
  VALUES ('SUPPLY', 'سلاسل الإمداد والمخازن', 'Supply Chain & Warehousing')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.departments (code, name_ar, name_en)
  VALUES ('FINANCE', 'الإدارة المالية والحسابات', 'Finance & Accounting')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.departments (code, name_ar, name_en)
  VALUES ('AUDIT', 'الجودة والرقابة الداخلية', 'Quality Control & Audit')
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'المدير العام والمالك', 'General Manager & Owner', id
    FROM public.departments WHERE code = 'EXEC';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'المدير المالي ورئيس الحسابات', 'Chief Financial Officer', id
    FROM public.departments WHERE code = 'FINANCE';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'الشيف التنفيذي لحلويات الوزير', 'Executive Pastry Chef', id
    FROM public.departments WHERE code = 'KITCHEN';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'مدير فرع ونقاط بيع', 'Branch Sales Manager', id
    FROM public.departments WHERE code = 'RETAIL';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'أمين مخزن خامات ومستلزمات', 'Raw Materials Storekeeper', id
    FROM public.departments WHERE code = 'SUPPLY';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'محاسب تكاليف وفروع', 'Branch & Cost Accountant', id
    FROM public.departments WHERE code = 'FINANCE';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'كاشير ومسؤول بيع فوري', 'Retail Cashier & Sales Rep', id
    FROM public.departments WHERE code = 'RETAIL';
  INSERT INTO public.positions (title_ar, title_en, department_id)
    SELECT 'مراجع داخلي ورقابة مالية', 'Internal Compliance Auditor', id
    FROM public.departments WHERE code = 'AUDIT';
END $$;


DROP POLICY IF EXISTS "HR read all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees read own profile" ON public.employees;
CREATE POLICY "Enable read for all authenticated users on employees" ON public.employees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users on departments" ON public.departments FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users on positions" ON public.positions FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable read for authenticated users on user_roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
