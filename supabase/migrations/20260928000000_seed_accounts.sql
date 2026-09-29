-- Seed default accounts with 0 balance
DO $$
DECLARE
  v_id uuid;
BEGIN
-- Pass 1: Insert all accounts without parent_ids
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1000', 'الأصول', 'Assets', 'asset', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1100', 'الأصول المتداولة', 'Current Assets', 'asset', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1110', 'النقدية وما في حكمها', 'Cash & Cash Equivalents', 'asset', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1111', 'الخزينة النقدية الرئيسية', 'Main Cash Safe', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1112', 'حساب البنك التجاري الدولي (CIB)', 'CIB Bank Account', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1113', 'حساب البنك الأهلي المصري (NBE)', 'NBE Bank Account', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1120', 'العملاء وأوراق القبض', 'Receivables & Notes', 'asset', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1121', 'العملاء التجاريون', 'Trade Receivables', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1122', 'أوراق القبض', 'Notes Receivable', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1130', 'المخزون السلعي', 'Merchandise Inventory', 'asset', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1131', 'مخزون بضاعة بغرض البيع', 'Finished Goods Inventory', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1140', 'أرصدة مدينة ومصروفات مدفوعة مقدماً', 'Prepaid Expenses & Other Receivables', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1200', 'الأصول الثابتة وغير المتداولة', 'Fixed & Non-Current Assets', 'asset', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1210', 'أجهزة تكنولوجيا ومعدات مكتبية', 'IT & Office Equipment', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('1220', 'مجمع إهلاك الأصول الثابتة', 'Accumulated Depreciation', 'asset', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2000', 'الخصوم والالتزامات', 'Liabilities', 'liability', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2100', 'الالتزامات المتداولة', 'Current Liabilities', 'liability', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2110', 'الموردون وأوراق الدفع', 'Accounts Payable & Notes', 'liability', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2111', 'الموردون التجاريون', 'Trade Payables', 'liability', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2112', 'أوراق الدفع', 'Notes Payable', 'liability', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2120', 'ضريبة القيمة المضافة المستحقة', 'VAT Payable', 'liability', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('2130', 'مستحقات ومصروفات تشغيل مستحقة', 'Accrued Expenses & Payroll', 'liability', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('3000', 'حقوق الملكية', 'Equity', 'equity', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('3100', 'رأس المال المدفوع', 'Paid-in Capital', 'equity', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('3200', 'الأرباح المرحلة والمحتجزة', 'Retained Earnings', 'equity', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('3300', 'صافي أرباح الفترة الحالية', 'Current Period Net Profit', 'equity', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('4000', 'الإيرادات', 'Revenue', 'revenue', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('4100', 'إيرادات المبيعات والخدمات', 'Sales & Service Revenue', 'revenue', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('4110', 'مبيعات السوق المحلي', 'Domestic Sales', 'revenue', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('4120', 'مبيعات التصدير', 'Export Sales', 'revenue', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('4200', 'إيرادات وعوائد تشغيلية أخرى', 'Other Operating Revenue', 'revenue', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5000', 'المصروفات والتكاليف', 'Expenses', 'expense', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5100', 'تكلفة البضاعة المباعة (COGS)', 'Cost of Goods Sold', 'expense', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5200', 'المصروفات العمومية والتشغيلية', 'General & Operating Expenses', 'expense', true, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5210', 'رواتب ومستحقات العاملين', 'Salaries & Employee Benefits', 'expense', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5220', 'إيجار مقرات ومرافق وخدمات', 'Rent & Utilities', 'expense', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5230', 'مصروفات تسويق وتوزيع وشحن', 'Marketing & Logistics', 'expense', false, 0, true)
  ON CONFLICT (code) DO NOTHING;
  INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, opening_balance, is_active)
  VALUES ('5240', 'مصاريف بنكية وعمولات تحصيل', 'Bank Fees & Processing Charges', 'expense', false, 0, true)
  ON CONFLICT (code) DO NOTHING;

-- Pass 2: Update parent_ids
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1100' AND p.code = '1000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1110' AND p.code = '1100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1111' AND p.code = '1110';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1112' AND p.code = '1110';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1113' AND p.code = '1110';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1120' AND p.code = '1100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1121' AND p.code = '1120';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1122' AND p.code = '1120';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1130' AND p.code = '1100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1131' AND p.code = '1130';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1140' AND p.code = '1100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1200' AND p.code = '1000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1210' AND p.code = '1200';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '1220' AND p.code = '1200';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '2100' AND p.code = '2000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '2110' AND p.code = '2100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '2111' AND p.code = '2110';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '2112' AND p.code = '2110';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '2120' AND p.code = '2100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '2130' AND p.code = '2100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '3100' AND p.code = '3000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '3200' AND p.code = '3000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '3300' AND p.code = '3000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '4100' AND p.code = '4000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '4110' AND p.code = '4100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '4120' AND p.code = '4100';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '4200' AND p.code = '4000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '5100' AND p.code = '5000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '5200' AND p.code = '5000';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '5210' AND p.code = '5200';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '5220' AND p.code = '5200';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '5230' AND p.code = '5200';
  UPDATE public.accounts a
  SET parent_id = p.id
  FROM public.accounts p
  WHERE a.code = '5240' AND p.code = '5200';
END $$;
