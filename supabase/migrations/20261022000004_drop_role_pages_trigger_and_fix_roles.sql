-- ==============================================================================
-- Migration: 20261022000004_drop_role_pages_trigger_and_fix_roles.sql
-- Description: 
--   1. Drop automatic trigger `trg_sync_user_pages` that auto-inserts all pages
--      on role assignment. This ensures manual "Allowed Pages" are strictly respected.
--   2. Convert `public.user_roles.role` column to TEXT so any ERP role (e.g. helpdesk,
--      it, technician, accountant, hr, etc.) can be saved without enum errors.
--   3. Ensure no automatic page override occurs in PostgreSQL.
-- ==============================================================================

-- 1. Drop the automatic role-to-pages sync trigger and its function
DROP TRIGGER IF EXISTS trg_sync_user_pages ON public.user_roles;
DROP FUNCTION IF EXISTS public.handle_user_role_pages_sync();

-- 2. Allow any role string in public.user_roles by altering column type to text
ALTER TABLE public.user_roles ALTER COLUMN role TYPE text USING role::text;

-- 3. Confirm open RLS and full CRUD permissions
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;
GRANT ALL ON public.user_pages TO anon, authenticated, service_role;
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
