DROP POLICY IF EXISTS "Accountants read accounts" ON public.accounts;

CREATE POLICY "Enable read for authenticated users on accounts" ON public.accounts FOR SELECT TO authenticated USING (true);
