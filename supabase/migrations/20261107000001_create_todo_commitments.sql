-- ==============================================================================
-- Migration: 20261107000001_create_todo_commitments.sql
-- Description: Create todo_commitments table for tasks, bills, and monthly dues
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.todo_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  task_name text NOT NULL,
  task_name_en text,
  ref text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'paid', 'pending', 'has_issue'
  repeating_monthly boolean NOT NULL DEFAULT false,
  category text,
  branch_id text,
  notes text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS and permissive policy
ALTER TABLE public.todo_commitments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todo_commitments_permit_all" ON public.todo_commitments;
CREATE POLICY "todo_commitments_permit_all" ON public.todo_commitments FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.todo_commitments TO anon, authenticated, service_role;

