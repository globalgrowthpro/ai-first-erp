-- Add level column to positions
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS level text DEFAULT 'staff';

-- Update seeded positions with correct levels
UPDATE public.positions SET level = 'c-level' WHERE title_en IN ('General Manager & Owner', 'Chief Financial Officer');
UPDATE public.positions SET level = 'manager' WHERE title_en IN ('Executive Pastry Chef', 'Branch Sales Manager');
UPDATE public.positions SET level = 'specialist' WHERE title_en IN ('Raw Materials Storekeeper', 'Branch & Cost Accountant', 'Internal Compliance Auditor');
UPDATE public.positions SET level = 'staff' WHERE title_en IN ('Retail Cashier & Sales Rep');

-- Add code to positions if not present
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS code text;

-- Set position codes
UPDATE public.positions SET code = 'pos-gm' WHERE title_en = 'General Manager & Owner';
UPDATE public.positions SET code = 'pos-cfo' WHERE title_en = 'Chief Financial Officer';
UPDATE public.positions SET code = 'pos-chef' WHERE title_en = 'Executive Pastry Chef';
UPDATE public.positions SET code = 'pos-branch-mgr' WHERE title_en = 'Branch Sales Manager';
UPDATE public.positions SET code = 'pos-storekeeper' WHERE title_en = 'Raw Materials Storekeeper';
UPDATE public.positions SET code = 'pos-accountant' WHERE title_en = 'Branch & Cost Accountant';
UPDATE public.positions SET code = 'pos-cashier' WHERE title_en = 'Retail Cashier & Sales Rep';
UPDATE public.positions SET code = 'pos-auditor' WHERE title_en = 'Internal Compliance Auditor';
