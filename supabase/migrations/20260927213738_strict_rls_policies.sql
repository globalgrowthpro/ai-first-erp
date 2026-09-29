-- Helper Functions
CREATE OR REPLACE FUNCTION public.has_role(role_name text)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role::text = role_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the permissive policies on sensitive tables
DO $$
DECLARE
    t text;
    sensitive_tables text[] := array[
        'payslips', 'leave_requests', 'attendance', 'employees', 'payroll_runs',
        'journal_entries', 'journal_lines', 'accounts', 'payments',
        'helpdesk_tickets', 'sales_invoices', 'purchase_bills'
    ];
BEGIN
    FOREACH t IN ARRAY sensitive_tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "read for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "insert for authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "update for authenticated" ON public.%I', t);
        -- We keep "delete for admin"
    END LOOP;
END $$;

-- Helpdesk Policies
CREATE POLICY "Users read own tickets" ON public.helpdesk_tickets FOR SELECT TO authenticated
USING (auth.uid() = created_by OR public.is_admin());

CREATE POLICY "Users insert tickets" ON public.helpdesk_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users update own tickets" ON public.helpdesk_tickets FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR public.is_admin());

-- HR Policies (Employees, Payslips, Leave, Attendance)
CREATE POLICY "HR read all employees" ON public.employees FOR SELECT TO authenticated
USING (public.has_role('hr') OR public.is_admin());

CREATE POLICY "Employees read own profile" ON public.employees FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "HR read all payslips" ON public.payslips FOR SELECT TO authenticated
USING (public.has_role('hr') OR public.is_admin());

-- Accounting Policies (Journal Entries, Accounts, Payments)
CREATE POLICY "Accountants read journal" ON public.journal_entries FOR SELECT TO authenticated
USING (public.has_role('accountant') OR public.has_role('finance_manager') OR public.is_admin());

CREATE POLICY "Accountants write journal" ON public.journal_entries FOR ALL TO authenticated
USING (public.has_role('accountant') OR public.has_role('finance_manager') OR public.is_admin());

CREATE POLICY "Accountants read accounts" ON public.accounts FOR SELECT TO authenticated
USING (public.has_role('accountant') OR public.has_role('finance_manager') OR public.is_admin());

-- Sales & Purchasing
CREATE POLICY "Sales read invoices" ON public.sales_invoices FOR SELECT TO authenticated
USING (public.has_role('sales') OR public.has_role('sales_manager') OR public.is_admin());

CREATE POLICY "Purchasing read bills" ON public.purchase_bills FOR SELECT TO authenticated
USING (public.has_role('purchasing') OR public.has_role('purchasing_manager') OR public.is_admin());
