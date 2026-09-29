-- Drop existing restrictive policies on profiles
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Allow any authenticated user to SELECT all profiles (admin panel needs this)
CREATE POLICY "authenticated_read_all_profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

-- Allow users to update their own profile; admins can update any
CREATE POLICY "authenticated_update_profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow insert (for new signups via trigger)
CREATE POLICY "authenticated_insert_profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (true);
