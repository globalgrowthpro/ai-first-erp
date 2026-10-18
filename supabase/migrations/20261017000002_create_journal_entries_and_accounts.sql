-- ==============================================================================
-- Migration: 20261017000002_create_journal_entries_and_accounts.sql
-- Description: Schema, open RLS policies, and core accounts seed for 
--              public.journal_entries and public.journal_lines (قيود اليومية)
-- ==============================================================================

-- 1. Ensure public.accounts table exists with flexible constraints
CREATE TABLE IF NOT EXISTS public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  type text NOT NULL,
  parent_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  is_parent boolean DEFAULT false,
  is_active boolean DEFAULT true,
  opening_balance numeric(14,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. Ensure public.journal_entries table exists with flexible operational columns
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_no text NOT NULL UNIQUE,
  entry_date date NOT NULL DEFAULT current_date,
  description_ar text,
  description_en text,
  reference text,
  branch_id text,
  branch_name_ar text,
  branch_name_en text,
  status text NOT NULL DEFAULT 'posted',
  total_amount numeric(14,2) DEFAULT 0,
  is_posted boolean NOT NULL DEFAULT true,
  posted_at timestamptz DEFAULT now(),
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure operational columns exist if table already existed
ALTER TABLE public.journal_entries ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS branch_id text,
  ADD COLUMN IF NOT EXISTS branch_name_ar text,
  ADD COLUMN IF NOT EXISTS branch_name_en text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'posted',
  ADD COLUMN IF NOT EXISTS total_amount numeric(14,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS reference text;

-- Drop foreign key on created_by if it restricts to auth.users
ALTER TABLE public.journal_entries DROP CONSTRAINT IF EXISTS journal_entries_created_by_fkey;
ALTER TABLE public.journal_entries ALTER COLUMN created_by TYPE text USING created_by::text;

-- 3. Ensure public.journal_lines table exists
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  account_code text,
  account_name_ar text,
  account_name_en text,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  debit numeric(14,2) NOT NULL DEFAULT 0,
  credit numeric(14,2) NOT NULL DEFAULT 0,
  memo text,
  line_no integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure operational columns exist on journal_lines
ALTER TABLE public.journal_lines ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.journal_lines DROP CONSTRAINT IF EXISTS journal_lines_account_id_fkey;
ALTER TABLE public.journal_lines
  ADD COLUMN IF NOT EXISTS account_code text,
  ADD COLUMN IF NOT EXISTS account_name_ar text,
  ADD COLUMN IF NOT EXISTS account_name_en text,
  ADD COLUMN IF NOT EXISTS memo text;

-- 4. Drop restrictive policies and configure open RLS policies (matching employees and branches)
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accountants read journal" ON public.journal_entries;
DROP POLICY IF EXISTS "Accountants write journal" ON public.journal_entries;
DROP POLICY IF EXISTS "read for authenticated" ON public.journal_entries;
DROP POLICY IF EXISTS "insert for authenticated" ON public.journal_entries;
DROP POLICY IF EXISTS "update for authenticated" ON public.journal_entries;
DROP POLICY IF EXISTS "delete for admin" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_all_policy" ON public.journal_entries;

CREATE POLICY "journal_entries_all_policy" ON public.journal_entries
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "read for authenticated" ON public.journal_lines;
DROP POLICY IF EXISTS "insert for authenticated" ON public.journal_lines;
DROP POLICY IF EXISTS "update for authenticated" ON public.journal_lines;
DROP POLICY IF EXISTS "delete for admin" ON public.journal_lines;
DROP POLICY IF EXISTS "journal_lines_all_policy" ON public.journal_lines;

CREATE POLICY "journal_lines_all_policy" ON public.journal_lines
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "read for authenticated" ON public.accounts;
DROP POLICY IF EXISTS "Enable read for authenticated users on accounts" ON public.accounts;
DROP POLICY IF EXISTS "Accountants read accounts" ON public.accounts;
DROP POLICY IF EXISTS "accounts_all_policy" ON public.accounts;

CREATE POLICY "accounts_all_policy" ON public.accounts
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Grant table privileges to anon, authenticated, and service_role
GRANT ALL ON public.journal_entries TO anon, authenticated, service_role;
GRANT ALL ON public.journal_lines TO anon, authenticated, service_role;
GRANT ALL ON public.accounts TO anon, authenticated, service_role;

-- 6. Seed core default accounts if table is empty
INSERT INTO public.accounts (code, name_ar, name_en, type, is_parent, is_active, opening_balance)
VALUES
  ('1000', 'الأصول المتداولة', 'Current Assets', 'asset', true, true, 0),
  ('1010', 'النقدية بالصندوق والخزينة المركزية', 'Cash on Hand & Central Safe', 'asset', false, true, 1250000),
  ('1020', 'البنك الأهلي المصري — حساب جاري', 'National Bank of Egypt — Current', 'asset', false, true, 3450000),
  ('1021', 'بنك مصر — حساب العمليات ونقاط البيع', 'Banque Misr — Operations & POS', 'asset', false, true, 1890000),
  ('1030', 'العملاء والمدينون التجاريون', 'Accounts Receivable', 'asset', false, true, 420000),
  ('1040', 'مخزون الخامات والمستلزمات (المطبخ المركزي)', 'Raw Materials Inventory', 'asset', false, true, 890000),
  ('1050', 'مخزون الحلويات الجاهزة والتوزيع', 'Finished Goods Inventory', 'asset', false, true, 340000),
  ('2000', 'الالتزامات والخصوم المتداولة', 'Current Liabilities', 'liability', true, true, 0),
  ('2010', 'الموردون والدائنون التجاريون', 'Accounts Payable', 'liability', false, true, 680000),
  ('2020', 'أمانات ضرائب القيمة المضافة (14%)', 'VAT Output Tax Payable', 'liability', false, true, 142000),
  ('2030', 'مستحقات ورواتب العاملين', 'Accrued Payroll & Salaries', 'liability', false, true, 310000),
  ('3000', 'حقوق الملكية ورأس المال', 'Equity', 'equity', true, true, 0),
  ('3010', 'رأس مال شركة وزير الحلو', 'Paid-in Capital', 'equity', false, true, 6000000),
  ('3020', 'الأرباح المرحلة والمحتجزة', 'Retained Earnings', 'equity', false, true, 1268000),
  ('4000', 'إيرادات المبيعات', 'Revenue', 'revenue', true, true, 0),
  ('4010', 'مبيعات حلويات شرقية فاخرة (فروع)', 'Retail Oriental Sweets Sales', 'revenue', false, true, 0),
  ('4020', 'مبيعات المناسبات والحفلات والتوريدات', 'Catering & Events Sales', 'revenue', false, true, 0),
  ('4030', 'مبيعات التوصيل والطلبات أونلاين', 'Online Delivery Revenue', 'revenue', false, true, 0),
  ('5000', 'تكلفة البضاعة المباعة', 'Cost of Goods Sold', 'expense', true, true, 0),
  ('5010', 'تكلفة خامات التصنيع والسمن والمكسرات', 'Ingredients & Raw Materials Cost', 'expense', false, true, 0),
  ('5020', 'تكلفة تغليف وعلب وزير الحلو الفاخرة', 'Packaging & Box Materials', 'expense', false, true, 0),
  ('6000', 'المصروفات التشغيلية والعمومية', 'Operating Expenses', 'expense', true, true, 0),
  ('6010', 'رواتب وأجور موظفي الفروع والمطبخ', 'Salaries & Wages', 'expense', false, true, 0),
  ('6020', 'إيجارات الفروع ومنافذ البيع', 'Branch Rent Expenses', 'expense', false, true, 0),
  ('6030', 'مصروفات الصيانة وتشغيل الأفران', 'Maintenance & Kitchen Utilities', 'expense', false, true, 0)
ON CONFLICT (code) DO NOTHING;
