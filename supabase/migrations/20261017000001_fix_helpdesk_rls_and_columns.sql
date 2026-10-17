-- ==============================================================================
-- Migration: 20261017000001_fix_helpdesk_rls_and_columns.sql
-- Description: Drop dependent RLS policies first, then alter column types
--              and enable open CRUD policies for helpdesk tables.
-- ==============================================================================

-- 1. DROP ALL EXISTING POLICIES FIRST (Postgres requirement before altering column types)
DROP POLICY IF EXISTS "Users read own tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Users insert tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "Users update own tickets" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "read for authenticated" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "insert for authenticated" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "update for authenticated" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "delete for admin" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "helpdesk_tickets_all_policy" ON public.helpdesk_tickets;
DROP POLICY IF EXISTS "helpdesk_tickets_permit_all" ON public.helpdesk_tickets;

DROP POLICY IF EXISTS "read for authenticated" ON public.helpdesk_ticket_responses;
DROP POLICY IF EXISTS "insert for authenticated" ON public.helpdesk_ticket_responses;
DROP POLICY IF EXISTS "update for authenticated" ON public.helpdesk_ticket_responses;
DROP POLICY IF EXISTS "delete for admin" ON public.helpdesk_ticket_responses;
DROP POLICY IF EXISTS "helpdesk_responses_all_policy" ON public.helpdesk_ticket_responses;
DROP POLICY IF EXISTS "helpdesk_responses_permit_all" ON public.helpdesk_ticket_responses;

-- 2. Drop restrictive foreign keys on assigned_to, created_by, and author_id
ALTER TABLE public.helpdesk_tickets DROP CONSTRAINT IF EXISTS helpdesk_tickets_assigned_to_fkey;
ALTER TABLE public.helpdesk_tickets DROP CONSTRAINT IF EXISTS helpdesk_tickets_created_by_fkey;
ALTER TABLE public.helpdesk_ticket_responses DROP CONSTRAINT IF EXISTS helpdesk_ticket_responses_author_id_fkey;

-- 3. Alter columns to TEXT so they accept UUIDs, staff names, or team titles without errors
ALTER TABLE public.helpdesk_tickets ALTER COLUMN assigned_to TYPE text USING assigned_to::text;
ALTER TABLE public.helpdesk_tickets ALTER COLUMN created_by TYPE text USING created_by::text;
ALTER TABLE public.helpdesk_ticket_responses ALTER COLUMN author_id TYPE text USING author_id::text;

-- 4. Ensure required operational columns and defaults exist
ALTER TABLE public.helpdesk_tickets ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.helpdesk_tickets ALTER COLUMN ticket_number SET DEFAULT ('TKT-' || to_char(now(), 'YYYY') || '-' || floor(random() * 9000 + 1000)::text);

ALTER TABLE public.helpdesk_tickets
  ADD COLUMN IF NOT EXISTS branch_or_location text,
  ADD COLUMN IF NOT EXISTS submitter_name text,
  ADD COLUMN IF NOT EXISTS submitter_role text,
  ADD COLUMN IF NOT EXISTS submitter_phone text,
  ADD COLUMN IF NOT EXISTS sla_due_hours integer DEFAULT 24,
  ADD COLUMN IF NOT EXISTS resolution_notes text;

ALTER TABLE public.helpdesk_ticket_responses
  ADD COLUMN IF NOT EXISTS sender_name text,
  ADD COLUMN IF NOT EXISTS sender_role text;

-- 5. Enable RLS and create open access policies matching other ERP tables
ALTER TABLE public.helpdesk_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.helpdesk_ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "helpdesk_tickets_all_policy" ON public.helpdesk_tickets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "helpdesk_responses_all_policy" ON public.helpdesk_ticket_responses
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Grant all table permissions to anon, authenticated, and service_role
GRANT ALL ON public.helpdesk_tickets TO anon, authenticated, service_role;
GRANT ALL ON public.helpdesk_ticket_responses TO anon, authenticated, service_role;
