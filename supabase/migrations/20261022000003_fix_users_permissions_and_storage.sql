-- ==============================================================================
-- Migration: 20261022000003_fix_users_permissions_and_storage.sql
-- Description: Fix storage and permissions for profiles, user_roles, and user_pages.
--              1. Drop strict auth.users FK constraints so ERP admin can manage users.
--              2. Grant full CRUD permissions to anon, authenticated, and service_role.
--              3. Configure open RLS policies matching employees, branches, and accounts.
--              4. Ensure all columns (branch, helpdesk_scope, helpdesk_branch, allowed_actions) exist.
-- ==============================================================================

-- 1. Ensure public.profiles has all necessary columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS branch text,
  ADD COLUMN IF NOT EXISTS helpdesk_scope text DEFAULT 'assigned_to_me_only',
  ADD COLUMN IF NOT EXISTS helpdesk_branch text,
  ADD COLUMN IF NOT EXISTS allowed_actions text[] DEFAULT '{}';

-- 2. Drop strict auth.users foreign key constraints
-- This allows ERP admin user creation and updates to link directly without requiring Supabase internal auth signup
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_pages DROP CONSTRAINT IF EXISTS user_pages_user_id_fkey;

-- 3. Grant full permissions on profiles, user_roles, and user_pages to all client roles
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.user_roles TO anon, authenticated, service_role;
GRANT ALL ON public.user_pages TO anon, authenticated, service_role;

-- 4. Open RLS Policies for public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_open_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_crud_all" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_read_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_update_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_insert_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin insert profile" ON public.profiles;
DROP POLICY IF EXISTS "admin delete profile" ON public.profiles;
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;

CREATE POLICY "profiles_open_policy" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Open RLS Policies for public.user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_open_policy" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_crud_all" ON public.user_roles;
DROP POLICY IF EXISTS "roles read" ON public.user_roles;
DROP POLICY IF EXISTS "roles admin write" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_all" ON public.user_roles;
DROP POLICY IF EXISTS "Enable read for authenticated users on user_roles" ON public.user_roles;

CREATE POLICY "user_roles_open_policy" ON public.user_roles
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Open RLS Policies for public.user_pages
ALTER TABLE public.user_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_pages_open_policy" ON public.user_pages;
DROP POLICY IF EXISTS "pages allow read all" ON public.user_pages;
DROP POLICY IF EXISTS "pages allow authenticated write" ON public.user_pages;
DROP POLICY IF EXISTS "pages read" ON public.user_pages;
DROP POLICY IF EXISTS "pages admin write" ON public.user_pages;

CREATE POLICY "user_pages_open_policy" ON public.user_pages
  FOR ALL USING (true) WITH CHECK (true);

-- 7. Add tables to Realtime publication if not already added
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_pages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_pages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_roles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles;
  END IF;
END $$;
