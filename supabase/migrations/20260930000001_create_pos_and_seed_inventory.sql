-- Migration: 20260930000001_create_pos_and_seed_inventory.sql
-- Description: Create dedicated POS tables, relax RLS for full real-time database CRUD, and seed live inventory tables

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create dedicated POS tables
CREATE TABLE IF NOT EXISTS public.pos_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  cashier_id text NOT NULL DEFAULT '',
  cashier_name text NOT NULL DEFAULT '',
  branch_id text NOT NULL DEFAULT 'wh-korba',
  order_type text NOT NULL DEFAULT 'takeaway',
  order_platform text NOT NULL DEFAULT 'direct',
  order_ref_number text DEFAULT '',
  customer_name text DEFAULT 'عميل نقدي / صالة',
  customer_phone text DEFAULT '',
  table_number text DEFAULT '',
  delivery_notes text DEFAULT '',
  payment_method text NOT NULL DEFAULT 'cash',
  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  tax_amount numeric(14,2) NOT NULL DEFAULT 0,
  discount_amount numeric(14,2) NOT NULL DEFAULT 0,
  delivery_fee numeric(14,2) NOT NULL DEFAULT 0,
  total numeric(14,2) NOT NULL DEFAULT 0,
  tender_amount numeric(14,2) NOT NULL DEFAULT 0,
  change_amount numeric(14,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.pos_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  sku text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  quantity numeric(14,3) NOT NULL DEFAULT 1,
  unit_price numeric(14,2) NOT NULL DEFAULT 0,
  total_price numeric(14,2) NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pos_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_number text NOT NULL UNIQUE,
  cashier_id text NOT NULL,
  cashier_name text NOT NULL,
  branch_id text NOT NULL DEFAULT 'wh-korba',
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opening_cash numeric(14,2) NOT NULL DEFAULT 0,
  total_sales numeric(14,2) NOT NULL DEFAULT 0,
  cash_sales numeric(14,2) NOT NULL DEFAULT 0,
  card_sales numeric(14,2) NOT NULL DEFAULT 0,
  wallet_sales numeric(14,2) NOT NULL DEFAULT 0,
  orders_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Open RLS policies to allow full real-time database operations
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'categories', 'units', 'warehouses', 'products', 'stock_levels', 'stock_moves', 
    'boms', 'bom_lines', 'pos_orders', 'pos_order_items', 'pos_shifts',
    'sales_invoices', 'sales_invoice_lines'
  ];
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_permit_all" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "%s_permit_all" ON public.%I FOR ALL USING (true) WITH CHECK (true);', t, t);
    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role;', t);
  END LOOP;
END $$;

-- 3. Seed Units
INSERT INTO public.units (id, code, name_ar, name_en) VALUES
  ('10000000-0000-0000-0000-000000000001', 'BOX', 'علبة', 'Box'),
  ('10000000-0000-0000-0000-000000000002', 'TRAY', 'صينية', 'Tray'),
  ('10000000-0000-0000-0000-000000000003', 'CAKE', 'تورتة', 'Cake'),
  ('10000000-0000-0000-0000-000000000004', 'SCOOP', 'بولة', 'Scoop'),
  ('10000000-0000-0000-0000-000000000005', 'CUP', 'عبوة', 'Cup'),
  ('10000000-0000-0000-0000-000000000006', 'BTL', 'زجاجة', 'Bottle'),
  ('10000000-0000-0000-0000-000000000007', 'KG', 'كيلوجرام', 'Kg'),
  ('10000000-0000-0000-0000-000000000008', 'LTR', 'لتر', 'Liter')
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en;

-- 4. Seed Categories
INSERT INTO public.categories (id, code, name_ar, name_en) VALUES
  ('20000000-0000-0000-0000-000000000001', 'CAT-RICE', 'عشاق الرز', 'Rice Pudding'),
  ('20000000-0000-0000-0000-000000000002', 'CAT-FATTA', 'الفتة', 'Royal Fatta'),
  ('20000000-0000-0000-0000-000000000003', 'CAT-DALAA', 'دنيا الدلع', 'Specialties'),
  ('20000000-0000-0000-0000-000000000004', 'CAT-TAJIN', 'الطواجن', 'Hot Tajins'),
  ('20000000-0000-0000-0000-000000000005', 'CAT-SHW', 'شاورما الوزير', 'Sweet Shawarma'),
  ('20000000-0000-0000-0000-000000000006', 'CAT-CAKE', 'كيك وتشييز', 'Cakes & Sweets'),
  ('20000000-0000-0000-0000-000000000007', 'CAT-KSHR', 'كشري الحلو', 'Sweet Koshary'),
  ('20000000-0000-0000-0000-000000000008', 'CAT-KSHT', 'القشطوطة', 'Kashtouta'),
  ('20000000-0000-0000-0000-000000000009', 'CAT-GIFT', 'علب الهدايا', 'Gift Boxes'),
  ('20000000-0000-0000-0000-000000000010', 'CAT-DRNK', 'مشروبات وإضافات', 'Drinks & Extras'),
  ('20000000-0000-0000-0000-000000000011', 'CAT-RAW', 'مواد خام ومستلزمات', 'Raw Materials'),
  ('20000000-0000-0000-0000-000000000012', 'CAT-PKG', 'مواد التعبئة والتغليف', 'Packaging')
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en;

-- 5. Seed Warehouses
INSERT INTO public.warehouses (id, code, name_ar, name_en, location, is_active) VALUES
  ('30000000-0000-0000-0000-000000000001', 'WH-KORBA', 'فرع الكوربة — مصر الجديدة', 'Heliopolis Branch', '14 شارع بغداد، الكوربة', true),
  ('30000000-0000-0000-0000-000000000002', 'WH-MAADI', 'فرع المعادي — شارع النصر', 'Maadi Branch', 'شارع 9، المعادي', true),
  ('30000000-0000-0000-0000-000000000003', 'WH-TAGAMOA', 'فرع التجمع الخامس — التسعين', 'Tagamoa Branch', 'التسعين الشمالي، القاهرة الجديدة', true),
  ('30000000-0000-0000-0000-000000000004', 'WH-FACTORY', 'مصنع العاشر المركزي الرئيسي', 'Central Factory & Kitchen', 'المنطقة الصناعية B3، العاشر من رمضان', true)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  location = EXCLUDED.location;

-- 6. Seed Products (Sellable POS Items + Raw Materials)
INSERT INTO public.products (id, sku, name_ar, name_en, category_id, unit_id, cost_price, sale_price, reorder_level, is_raw_material, is_active, image_url) VALUES
  -- عشاق الرز
  ('40000000-0000-0000-0000-000000000001', 'RICE-NUT', 'رز بلبن نوتيلا', 'Rice Pudding Nutella', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 25, 50, 30, false, true, '/products/rice-nutella.jpg'),
  ('40000000-0000-0000-0000-000000000002', 'RICE-NUTS', 'رز بلبن مكسرات', 'Rice Pudding Mixed Nuts', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 28, 55, 25, false, true, '/products/rice-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000003', 'RICE-LOT', 'رز بلبن لوتس', 'Rice Pudding Lotus', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 28, 55, 25, false, true, '/products/fatta-wazeer.jpg'),
  ('40000000-0000-0000-0000-000000000004', 'RICE-PST', 'رز بلبن بستاشيو', 'Rice Pudding Pistachio', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 42, 80, 20, false, true, '/products/rice-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000005', 'RICE-WZR', 'رز بلبن الوزير', 'Rice Pudding Al-Wazeer', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 40, 80, 25, false, true, '/products/rice-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000006', 'RICE-PLN', 'رز بلبن ساده', 'Plain Rice Pudding', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 12, 25, 40, false, true, '/products/rice-pistachio.jpg'),

  -- الفتة
  ('40000000-0000-0000-0000-000000000007', 'FAT-WZR', 'فتة ميكس الوزير', 'Fatta Mix Al-Wazeer', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 48, 90, 15, false, true, '/products/fatta-wazeer.jpg'),
  ('40000000-0000-0000-0000-000000000008', 'FAT-NUT', 'فتة نوتيلا', 'Fatta Nutella', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 46, 90, 15, false, true, '/products/rice-nutella.jpg'),
  ('40000000-0000-0000-0000-000000000009', 'FAT-MNG', 'فتة مانجا', 'Fatta Mango', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 45, 90, 15, false, true, '/products/kashtouta-mango.jpg'),
  ('40000000-0000-0000-0000-000000000010', 'FAT-PST', 'فتة بستاشيو', 'Fatta Pistachio', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 52, 95, 15, false, true, '/products/fatta-wazeer.jpg'),

  -- دنيا الدلع
  ('40000000-0000-0000-0000-000000000011', 'MDL-MNG', 'مدلعة مانجو', 'Medala''a Mango', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 38, 75, 20, false, true, '/products/kashtouta-mango.jpg'),
  ('40000000-0000-0000-0000-000000000012', 'MDL-CRM', 'مدلعة كراميل', 'Medala''a Caramel', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 32, 65, 20, false, true, '/products/medalaa.jpg'),
  ('40000000-0000-0000-0000-000000000013', 'MLK-WZR', 'ملوخيتو سلانكاتية وزير', 'Molokhito Wazeer', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 50, 95, 15, false, true, '/products/molokhito.jpg'),
  ('40000000-0000-0000-0000-000000000014', 'MLK-NUT', 'ملوخيتو نوتيلا', 'Molokhito Nutella', '20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 48, 95, 15, false, true, '/products/molokhito.jpg'),

  -- الطواجن
  ('40000000-0000-0000-0000-000000000015', 'TJ-ALI', 'طاجن ام علي قشطة مكسرات', 'Om Ali Cream & Nuts', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 35, 70, 25, false, true, '/products/om-ali.jpg'),
  ('40000000-0000-0000-0000-000000000016', 'TJ-NUT', 'طاجن نوتيلا', 'Tajin Nutella', '20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 28, 55, 20, false, true, '/products/rice-nutella.jpg'),

  -- شاورما الوزير
  ('40000000-0000-0000-0000-000000000017', 'SHW-NUT', 'شاورما نوتيلا', 'Sweet Shawarma Nutella', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 60, 115, 12, false, true, '/products/shawarma-crepe.jpg'),
  ('40000000-0000-0000-0000-000000000018', 'SHW-MIX', 'شاورما ميكس', 'Sweet Shawarma Mix', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 65, 125, 10, false, true, '/products/shawarma-crepe.jpg'),
  ('40000000-0000-0000-0000-000000000019', 'SHW-PST', 'شاورما بستاشيو', 'Sweet Shawarma Pistachio', '20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 70, 130, 10, false, true, '/products/shawarma-crepe.jpg'),

  -- كيك وتشييز
  ('40000000-0000-0000-0000-000000000020', 'CK-LND-KND', 'كيكة لندن كيندر', 'London Cake Kinder', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 65, 125, 10, false, true, '/products/cheesecake-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000021', 'CK-LND-NUT', 'كيكة لندن نوتيلا', 'London Cake Nutella', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 65, 125, 10, false, true, '/products/rice-nutella.jpg'),
  ('40000000-0000-0000-0000-000000000022', 'CHZ-PST', 'تشيز طاخ بستاشيو', 'Cheesecake Takh Pistachio', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', 50, 95, 10, false, true, '/products/cheesecake-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000023', 'TRT-LOT-FAM', 'تورتة لوتس كيندر فاميلي', 'Lotus Kinder Family Cake', '20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000003', 180, 340, 4, false, true, '/products/cheesecake-pistachio.jpg'),

  -- كشري الحلو
  ('40000000-0000-0000-0000-000000000024', 'KSHR-LUX', 'كشري حلو سوبر لوكس', 'Sweet Koshary Super Luxe', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 52, 100, 20, false, true, '/products/koshary-luxe.jpg'),
  ('40000000-0000-0000-0000-000000000025', 'KSHR-KND', 'كشري حلو كيندر', 'Sweet Koshary Kinder', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 42, 80, 30, false, true, '/products/koshary-luxe.jpg'),
  ('40000000-0000-0000-0000-000000000026', 'KSHR-PST', 'كشري حلو بستاشيو', 'Sweet Koshary Pistachio', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 50, 95, 20, false, true, '/products/koshary-luxe.jpg'),
  ('40000000-0000-0000-0000-000000000027', 'KSHR-NUT', 'كشري حلو نوتيلا', 'Sweet Koshary Nutella', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 38, 75, 25, false, true, '/products/koshary-luxe.jpg'),
  ('40000000-0000-0000-0000-000000000028', 'KSHR-WZR', 'كشري حلو ميكس الوزير', 'Sweet Koshary Mix Al-Wazeer', '20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', 42, 80, 20, false, true, '/products/koshary-luxe.jpg'),

  -- القشطوطة
  ('40000000-0000-0000-0000-000000000029', 'KSH-PST', 'قشطوطة بستاشيو', 'Kashtouta Pistachio', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 46, 90, 20, false, true, '/products/kashtouta-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000030', 'KSH-MSR', 'قشطوطة مصر الجديدة', 'Kashtouta Masr El-Gedida', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 44, 85, 25, false, true, '/products/kashtouta-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000031', 'KSH-NUT', 'قشطوطة نوتيلا', 'Kashtouta Nutella', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 40, 80, 20, false, true, '/products/rice-nutella.jpg'),
  ('40000000-0000-0000-0000-000000000032', 'KSH-MNG', 'قشطوطة مانجو', 'Kashtouta Mango', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 40, 80, 20, false, true, '/products/kashtouta-mango.jpg'),
  ('40000000-0000-0000-0000-000000000033', 'KSH-RIC-NUT', 'قشطوطة أرز باللبن نوتيلا', 'Kashtouta Rice Pudding Nutella', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 40, 80, 20, false, true, '/products/rice-nutella.jpg'),
  ('40000000-0000-0000-0000-000000000034', 'KSH-RIC-PST', 'قشطوطة أرز باللبن بستاشيو', 'Kashtouta Rice Pudding Pistachio', '20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000001', 50, 95, 15, false, true, '/products/rice-pistachio.jpg'),

  -- علب الهدايا
  ('40000000-0000-0000-0000-000000000035', 'BOX-ROYAL-1KG', 'بوكس مشكل ملوكي فاخر 1 كجم', 'Royal Mixed Sweets Box 1kg', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 120, 220, 10, false, true, '/products/baklava-box.jpg'),
  ('40000000-0000-0000-0000-000000000036', 'BOX-ROYAL-2KG', 'صينية ضيافة ملكية مشكلة 2 كجم', 'Imperial Confectionery Platter 2kg', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000002', 240, 430, 5, false, true, '/products/baklava-box.jpg'),
  ('40000000-0000-0000-0000-000000000037', 'BKL-PIST-VIP', 'علبة بقلاوة تركية فستق حلبي بيور', 'Pistachio Turkish Baklava Box', '20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000001', 150, 280, 8, false, true, '/products/baklava-box.jpg'),

  -- مشروبات وإضافات
  ('40000000-0000-0000-0000-000000000038', 'ICE-SCOOP', 'بولاية آيس كريم فانيليا إضافية', 'Extra Vanilla Ice Cream Scoop', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004', 8, 25, 20, false, true, '/products/kashtouta-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000039', 'EX-PIST-SAUCE', 'صوص بستاشيو بلجيكي خام إضافي', 'Extra Belgian Pistachio Sauce', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 12, 35, 20, false, true, '/products/cheesecake-pistachio.jpg'),
  ('40000000-0000-0000-0000-000000000040', 'EX-NUT-SAUCE', 'صوص نوتيلا أصلي إضافي', 'Extra Original Nutella Sauce', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000005', 10, 25, 25, false, true, '/products/rice-nutella.jpg'),
  ('40000000-0000-0000-0000-000000000041', 'WATER-MINERAL', 'مياه معدنية طبيعية 600 مل', 'Pure Mineral Water 600ml', '20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000006', 5, 15, 50, false, true, '/products/mineral-water.jpg'),

  -- مواد خام ومستلزمات (Raw Materials)
  ('40000000-0000-0000-0000-000000000042', 'RAW-NUTELLA-15KG', 'نوتيلا فيريرو إيطالي أصلي 15 كجم', 'Ferrero Nutella Tub 15kg', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000007', 3033, 3033, 5, true, true, null),
  ('40000000-0000-0000-0000-000000000043', 'RAW-RICE-25KG', 'أرز مصري فاخر حبة رفيعة 25 كجم', 'Egyptian Premium Rice 25kg', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000007', 750, 750, 10, true, true, null),
  ('40000000-0000-0000-0000-000000000044', 'RAW-SUGAR-50KG', 'سكر أبيض نقي 50 كجم', 'White Sugar 50kg', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000007', 1650, 1650, 8, true, true, null),
  ('40000000-0000-0000-0000-000000000045', 'RAW-MILK-10L', 'حليب بقري كامل الدسم طازج 10 لتر', 'Fresh Whole Milk 10L', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000008', 380, 380, 15, true, true, null),
  ('40000000-0000-0000-0000-000000000046', 'RAW-CREAM-5KG', 'قشطة بلدي طبيعية 5 كجم', 'Natural Clotted Cream 5kg', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000007', 1200, 1200, 6, true, true, null),
  ('40000000-0000-0000-0000-000000000047', 'RAW-PIST-5KG', 'فستق حلبي محمص 5 كجم', 'Roasted Pistachio 5kg', '20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000007', 4200, 4200, 3, true, true, null),
  ('40000000-0000-0000-0000-000000000048', 'PKG-BOWL-RICE', 'أطباق أرز باللبن مع غطاء (كرتونة 500)', 'Rice Pudding Bowls & Lids (500ct)', '20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000001', 450, 450, 10, true, true, null)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  sale_price = EXCLUDED.sale_price,
  cost_price = EXCLUDED.cost_price,
  category_id = EXCLUDED.category_id,
  unit_id = EXCLUDED.unit_id,
  image_url = EXCLUDED.image_url;

-- 7. Seed Stock Levels across Warehouses
INSERT INTO public.stock_levels (product_id, warehouse_id, quantity)
SELECT p.id, '30000000-0000-0000-0000-000000000001'::uuid, 
  CASE 
    WHEN p.sku LIKE 'RICE%' THEN 100
    WHEN p.sku LIKE 'FAT%' THEN 45
    WHEN p.sku LIKE 'KSH%' THEN 80
    WHEN p.sku LIKE 'BOX%' THEN 30
    WHEN p.sku LIKE 'RAW%' THEN 15
    ELSE 50
  END
FROM public.products p
ON CONFLICT (product_id, warehouse_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- 8. Seed Initial POS Shift for Cashier
INSERT INTO public.pos_shifts (
  id, shift_number, cashier_id, cashier_name, branch_id, opened_at, opening_cash, total_sales, cash_sales, card_sales, orders_count, status
) VALUES (
  '50000000-0000-0000-0000-000000000001', 'SHIFT-KB-101', 'usr_korba_1', 'أحمد ممدوح', '30000000-0000-0000-0000-000000000001', now(), 1500, 0, 0, 0, 0, 'open'
) ON CONFLICT (id) DO NOTHING;

-- 9. Automatic Inventory Deduction Trigger on POS Sale
CREATE OR REPLACE FUNCTION public.process_pos_order_item_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_warehouse_id uuid;
  v_branch_text text;
BEGIN
  -- Retrieve order branch
  SELECT branch_id INTO v_branch_text FROM public.pos_orders WHERE id = NEW.order_id;
  
  -- Resolve warehouse UUID
  IF v_branch_text IS NOT NULL AND v_branch_text ~ '^[0-9a-fA-F-]{36}$' THEN
    v_warehouse_id := v_branch_text::uuid;
  ELSE
    SELECT id INTO v_warehouse_id FROM public.warehouses LIMIT 1;
  END IF;

  -- Record stock move
  INSERT INTO public.stock_moves (
    move_type,
    product_id,
    from_warehouse_id,
    to_warehouse_id,
    quantity,
    unit_cost,
    reference,
    moved_at
  ) VALUES (
    'out',
    NEW.product_id,
    v_warehouse_id,
    NULL,
    NEW.quantity,
    NEW.unit_price,
    'POS-SALE-' || NEW.sku,
    now()
  );

  -- Decrement stock level
  IF NEW.product_id IS NOT NULL AND v_warehouse_id IS NOT NULL THEN
    INSERT INTO public.stock_levels (product_id, warehouse_id, quantity)
    VALUES (NEW.product_id, v_warehouse_id, -NEW.quantity)
    ON CONFLICT (product_id, warehouse_id)
    DO UPDATE SET quantity = public.stock_levels.quantity - NEW.quantity, updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pos_order_item_stock ON public.pos_order_items;
CREATE TRIGGER trg_pos_order_item_stock
AFTER INSERT ON public.pos_order_items
FOR EACH ROW
EXECUTE FUNCTION public.process_pos_order_item_stock();

-- 10. Enable Supabase Realtime Publication for Live POS & Inventory
DO $$
DECLARE
  rec record;
  tables text[] := ARRAY['products', 'stock_levels', 'pos_orders', 'pos_order_items', 'pos_shifts', 'categories', 'warehouses', 'units'];
  t text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I;', t);
    END IF;
  END LOOP;
END $$;
