-- ==============================================================================
-- Migration: 20261022000001_helpdesk_permissions_and_scope.sql
-- Description: Add helpdesk_scope and helpdesk_branch columns to profiles,
--              attachments column to helpdesk_tickets, and configure database-level
--              scoping and permission structures for the AI-First ERP Helpdesk.
-- ==============================================================================

-- 1. Ensure profiles has helpdesk_scope, helpdesk_branch, and allowed_actions columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS helpdesk_scope text DEFAULT 'assigned_to_me_only',
  ADD COLUMN IF NOT EXISTS helpdesk_branch text,
  ADD COLUMN IF NOT EXISTS allowed_actions text[] DEFAULT '{}';

-- 2. Add constraint for helpdesk_scope valid values if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_helpdesk_scope_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_helpdesk_scope_check
      CHECK (helpdesk_scope IN ('branch_only', 'own_created_only', 'assigned_to_me_only', 'all_tickets'));
  END IF;
END $$;

-- 3. Ensure helpdesk_tickets has attachments column
ALTER TABLE public.helpdesk_tickets
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- 4. Create helpful index for query-level data scoping on helpdesk_tickets
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_assigned_to ON public.helpdesk_tickets (assigned_to);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_created_by ON public.helpdesk_tickets (created_by);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_branch_location ON public.helpdesk_tickets (branch_or_location);
CREATE INDEX IF NOT EXISTS idx_helpdesk_tickets_status ON public.helpdesk_tickets (status);

-- 5. Helper function for server-side evaluation of helpdesk ticket visibility
CREATE OR REPLACE FUNCTION public.can_user_view_helpdesk_ticket(
  p_ticket_id uuid,
  p_user_id uuid
) RETURNS boolean AS $$
DECLARE
  v_role text;
  v_scope text;
  v_branch text;
  v_user_name text;
  v_ticket_assigned text;
  v_ticket_created text;
  v_ticket_branch text;
BEGIN
  -- Get user profile parameters
  SELECT role, helpdesk_scope, helpdesk_branch, COALESCE(full_name_ar, full_name_en, email)
  INTO v_role, v_scope, v_branch, v_user_name
  FROM public.profiles
  WHERE id = p_user_id;

  -- Admin always has full access
  IF v_role = 'admin' OR v_scope = 'all_tickets' THEN
    RETURN true;
  END IF;

  -- Get ticket details
  SELECT assigned_to, created_by, branch_or_location
  INTO v_ticket_assigned, v_ticket_created, v_ticket_branch
  FROM public.helpdesk_tickets
  WHERE id = p_ticket_id;

  -- Assigned to me only: technicians are not bound to a branch, only see tickets assigned to them
  IF v_scope = 'assigned_to_me_only' THEN
    RETURN (v_ticket_assigned = p_user_id::text OR v_ticket_assigned ILIKE '%' || v_user_name || '%');
  END IF;

  -- Own created only: user only sees tickets they created
  IF v_scope = 'own_created_only' THEN
    RETURN (v_ticket_created = p_user_id::text OR v_ticket_created ILIKE '%' || v_user_name || '%');
  END IF;

  -- Branch only: restricted to tickets within their authorized branch
  IF v_scope = 'branch_only' AND v_branch IS NOT NULL THEN
    RETURN (v_ticket_branch ILIKE '%' || v_branch || '%');
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Ensure permissions are granted to roles
GRANT EXECUTE ON FUNCTION public.can_user_view_helpdesk_ticket(uuid, uuid) TO anon, authenticated, service_role;
