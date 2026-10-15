-- ==============================================================================
-- Migration: 20261015000001_seed_user_pages.sql
-- Comprehensive population of public.user_pages for all ERP users & roles
-- ==============================================================================

-- 1. Ensure user_pages table exists and has proper permissions
CREATE TABLE IF NOT EXISTS public.user_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, page_path)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pages TO authenticated, service_role;
GRANT SELECT ON public.user_pages TO anon;
ALTER TABLE public.user_pages ENABLE ROW LEVEL SECURITY;

-- 2. Clean RLS Policies for user_pages (allow authenticated & service role to manage)
DO $$
BEGIN
  DROP POLICY IF EXISTS "pages read" ON public.user_pages;
  DROP POLICY IF EXISTS "pages admin write" ON public.user_pages;
  DROP POLICY IF EXISTS "pages allow read all" ON public.user_pages;
  DROP POLICY IF EXISTS "pages allow authenticated write" ON public.user_pages;
END $$;

CREATE POLICY "pages allow read all" ON public.user_pages
  FOR SELECT TO public
  USING (true);

CREATE POLICY "pages allow authenticated write" ON public.user_pages
  FOR ALL TO authenticated, service_role
  USING (true)
  WITH CHECK (true);

-- 3. Populate user_pages for ALL ADMINS (Full ERP access across all 17 routes)
INSERT INTO public.user_pages (user_id, page_path)
SELECT DISTINCT u.id, p.path
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
CROSS JOIN (
  VALUES 
    ('/'),
    ('/pos'),
    ('/pos-shifts'),
    ('/sales'),
    ('/purchases'),
    ('/accounting'),
    ('/inventory'),
    ('/manufacturing'),
    ('/dispatch'),
    ('/partners'),
    ('/hr'),
    ('/reports'),
    ('/audit'),
    ('/helpdesk'),
    ('/ai'),
    ('/ai-modules'),
    ('/settings')
) AS p(path)
WHERE ur.role = 'admin'::public.app_role 
   OR u.email ILIKE '%admin%'
   OR u.email = 'wazeeradmin@erp.org'
   OR u.email = 'hafez@wazeer-elhelw.com'
ON CONFLICT (user_id, page_path) DO NOTHING;

-- 4. Populate user_pages for POS CASHIERS (Restricted to /pos)
INSERT INTO public.user_pages (user_id, page_path)
SELECT DISTINCT u.id, '/pos'
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'pos_cashier'::public.app_role 
   OR u.email ILIKE '%cashier%'
ON CONFLICT (user_id, page_path) DO NOTHING;

-- 5. Populate user_pages for SALES & BRANCH MANAGERS
INSERT INTO public.user_pages (user_id, page_path)
SELECT DISTINCT u.id, p.path
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
CROSS JOIN (
  VALUES 
    ('/pos'),
    ('/pos-shifts'),
    ('/sales'),
    ('/partners'),
    ('/reports')
) AS p(path)
WHERE ur.role = 'sales'::public.app_role
ON CONFLICT (user_id, page_path) DO NOTHING;

-- 6. Populate user_pages for CFO / ACCOUNTING
INSERT INTO public.user_pages (user_id, page_path)
SELECT DISTINCT u.id, p.path
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
CROSS JOIN (
  VALUES 
    ('/'),
    ('/accounting'),
    ('/sales'),
    ('/purchases'),
    ('/pos-shifts'),
    ('/reports'),
    ('/audit')
) AS p(path)
WHERE ur.role = 'cfo'::public.app_role
ON CONFLICT (user_id, page_path) DO NOTHING;

-- 7. Populate user_pages for WAREHOUSE / SUPPLY CHAIN
INSERT INTO public.user_pages (user_id, page_path)
SELECT DISTINCT u.id, p.path
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
CROSS JOIN (
  VALUES 
    ('/'),
    ('/inventory'),
    ('/purchases'),
    ('/manufacturing'),
    ('/dispatch'),
    ('/reports')
) AS p(path)
WHERE ur.role = 'warehouse'::public.app_role
ON CONFLICT (user_id, page_path) DO NOTHING;

-- 8. Populate user_pages for KITCHEN / CENTRAL FACTORY
INSERT INTO public.user_pages (user_id, page_path)
SELECT DISTINCT u.id, p.path
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
CROSS JOIN (
  VALUES 
    ('/manufacturing'),
    ('/inventory')
) AS p(path)
WHERE ur.role = 'kitchen'::public.app_role
ON CONFLICT (user_id, page_path) DO NOTHING;

-- 9. Automatic Trigger: Whenever a role is inserted or updated in public.user_roles, auto-sync public.user_pages
CREATE OR REPLACE FUNCTION public.handle_user_role_pages_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    INSERT INTO public.user_pages (user_id, page_path)
    SELECT NEW.user_id, p.path
    FROM (
      VALUES 
        ('/'), ('/pos'), ('/pos-shifts'), ('/sales'), ('/purchases'),
        ('/accounting'), ('/inventory'), ('/manufacturing'), ('/dispatch'),
        ('/partners'), ('/hr'), ('/reports'), ('/audit'), ('/helpdesk'),
        ('/ai'), ('/ai-modules'), ('/settings')
    ) AS p(path)
    ON CONFLICT (user_id, page_path) DO NOTHING;

  ELSIF NEW.role = 'pos_cashier' THEN
    INSERT INTO public.user_pages (user_id, page_path)
    VALUES (NEW.user_id, '/pos')
    ON CONFLICT (user_id, page_path) DO NOTHING;

  ELSIF NEW.role = 'sales' THEN
    INSERT INTO public.user_pages (user_id, page_path)
    SELECT NEW.user_id, p.path
    FROM (VALUES ('/pos'), ('/pos-shifts'), ('/sales'), ('/partners'), ('/reports')) AS p(path)
    ON CONFLICT (user_id, page_path) DO NOTHING;

  ELSIF NEW.role = 'cfo' THEN
    INSERT INTO public.user_pages (user_id, page_path)
    SELECT NEW.user_id, p.path
    FROM (VALUES ('/'), ('/accounting'), ('/sales'), ('/purchases'), ('/pos-shifts'), ('/reports'), ('/audit')) AS p(path)
    ON CONFLICT (user_id, page_path) DO NOTHING;

  ELSIF NEW.role = 'warehouse' THEN
    INSERT INTO public.user_pages (user_id, page_path)
    SELECT NEW.user_id, p.path
    FROM (VALUES ('/'), ('/inventory'), ('/purchases'), ('/manufacturing'), ('/dispatch'), ('/reports')) AS p(path)
    ON CONFLICT (user_id, page_path) DO NOTHING;

  ELSIF NEW.role = 'kitchen' THEN
    INSERT INTO public.user_pages (user_id, page_path)
    SELECT NEW.user_id, p.path
    FROM (VALUES ('/manufacturing'), ('/inventory')) AS p(path)
    ON CONFLICT (user_id, page_path) DO NOTHING;

  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_pages ON public.user_roles;
CREATE TRIGGER trg_sync_user_pages
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.handle_user_role_pages_sync();
