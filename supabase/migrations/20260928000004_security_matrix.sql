ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS security_matrix jsonb DEFAULT '{}'::jsonb;
