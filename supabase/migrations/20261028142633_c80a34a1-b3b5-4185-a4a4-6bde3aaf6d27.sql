DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
           WHERE schemaname='public' AND (roles @> ARRAY['public']::name[] OR roles @> ARRAY['anon']::name[])
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

DROP POLICY IF EXISTS user_roles_open_policy ON public.user_roles;
DROP POLICY IF EXISTS user_pages_open_policy ON public.user_pages;
CREATE POLICY "user_roles read" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_roles admin write" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "user_pages read" ON public.user_pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_pages admin write" ON public.user_pages FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());