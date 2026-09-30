-- ==============================================================================
-- Migration: Create Branches Table & Update Products Table
-- ==============================================================================

-- 1. Create Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  manager_name text,
  email text,
  phone text,
  city text,
  district text,
  map_url text,
  is_wazeer_owned boolean NOT NULL DEFAULT true, -- Is Wazeer owning? Yes (true) / No (false)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "branches_open_policy" ON public.branches;
CREATE POLICY "branches_open_policy" ON public.branches
  FOR ALL USING (true) WITH CHECK (true);

-- Seed Branches
INSERT INTO public.branches (
  code, name_ar, name_en, manager_name, email, phone, city, district, map_url, is_wazeer_owned, is_active
) VALUES 
(
  'korba',
  'فرع الكوربة — مصر الجديدة',
  'Korba — Heliopolis Branch',
  'أحمد سالم',
  'korba@wazeer-elhelw.com',
  '+20 100 455 2211',
  'القاهرة',
  'مصر الجديدة',
  'https://maps.google.com/?q=Korba+Heliopolis+Cairo',
  true,
  true
),
(
  'maadi',
  'فرع المعادي — شارع النصر',
  'Maadi — Al-Nasr St. Branch',
  'كريم ممدوح',
  'maadi@wazeer-elhelw.com',
  '+20 100 882 3344',
  'القاهرة',
  'المعادي',
  'https://maps.google.com/?q=Al-Nasr+St+Maadi+Cairo',
  true,
  true
),
(
  'tagamoa',
  'فرع التجمع الخامس — التسعين',
  'New Cairo — 90th St. Branch',
  'حازم شريف',
  'tagamoa@wazeer-elhelw.com',
  '+20 100 994 5566',
  'القاهرة الجديدة',
  'التجمع الخامس',
  'https://maps.google.com/?q=90th+St+New+Cairo',
  true,
  true
),
(
  'coast',
  'فرع الساحل الشمالي — مارينا',
  'North Coast — Marina Hub',
  'طارق حسام',
  'coast@wazeer-elhelw.com',
  '+20 100 331 7788',
  'مطروح',
  'مارينا العلمين',
  'https://maps.google.com/?q=Marina+El-Alamein',
  true,
  true
),
(
  'kitchen',
  'المطبخ المركزي — طلبات التوصيل',
  'Central Kitchen Delivery Hub',
  'الشيف إبراهيم عثمان',
  'kitchen@wazeer-elhelw.com',
  '+20 100 112 0000',
  'القاهرة',
  'مدينة نصر',
  'https://maps.google.com/?q=Nasr+City+Cairo',
  true,
  true
),
(
  'alex',
  'فرع الإسكندرية — سموحة (فرنشايز)',
  'Alexandria — Smouha Branch (Franchise)',
  'محمود عبد العزيز',
  'smouha@wazeer-franchise.com',
  '+20 100 771 9922',
  'الإسكندرية',
  'سموحة',
  'https://maps.google.com/?q=Smouha+Alexandria',
  false,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  manager_name = EXCLUDED.manager_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  city = EXCLUDED.city,
  district = EXCLUDED.district,
  map_url = EXCLUDED.map_url,
  is_wazeer_owned = EXCLUDED.is_wazeer_owned;

-- 2. Alter Products Table: Add Product Group, Branch ID (Optional), and Show on POS
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS product_group text,
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS show_on_pos boolean NOT NULL DEFAULT true;

-- Backfill Product Groups and Show on POS for existing products
UPDATE public.products
SET 
  show_on_pos = CASE WHEN is_raw_material = true THEN false ELSE true END,
  product_group = CASE 
    WHEN is_raw_material = true THEN 'مواد خام ومستلزمات'
    WHEN sku LIKE 'RICE%' THEN 'عشاق الرز'
    WHEN sku LIKE 'FAT%' THEN 'الفتة الملكية'
    WHEN sku LIKE 'MDL%' OR sku LIKE 'MLK%' THEN 'دنيا الدلع'
    WHEN sku LIKE 'TJ%' THEN 'طواجن ساخنة'
    WHEN sku LIKE 'SHW%' THEN 'شاورما الحلو'
    WHEN sku LIKE 'CK%' OR sku LIKE 'CHZ%' OR sku LIKE 'TRT%' THEN 'كيك وتشييز'
    WHEN sku LIKE 'KSHR%' THEN 'كشري الحلو'
    WHEN sku LIKE 'KSH-%' THEN 'القشطوطة الأصلية'
    WHEN sku LIKE 'BOX%' OR sku LIKE 'BKL%' THEN 'علب الهدايا'
    WHEN sku LIKE 'ICE%' OR sku LIKE 'EX%' OR sku LIKE 'WATER%' THEN 'مشروبات وإضافات'
    ELSE 'حلويات عامة'
  END
WHERE product_group IS NULL;

-- 3. Add Branches to Realtime Publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'branches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  END IF;
END $$;
