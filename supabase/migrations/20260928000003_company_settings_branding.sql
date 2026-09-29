ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS branding jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS website text;

DROP POLICY IF EXISTS "Enable all for authenticated users on company_settings" ON public.company_settings;
CREATE POLICY "Enable all for authenticated users on company_settings" ON public.company_settings FOR ALL TO authenticated USING (true);
