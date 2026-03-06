-- Fix infinite recursion in family_members RLS policies
-- The issue is that SELECT policy queries the same table it protects
-- Solution: Use simple policies without self-referencing queries

-- Drop ALL possible policy names that might exist
DROP POLICY IF EXISTS "Users can view members of their families" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can insert members" ON public.family_members;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can insert members" ON public.family_members;
DROP POLICY IF EXISTS "Family owners and admins can update members" ON public.family_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.family_members;
DROP POLICY IF EXISTS "Users can update own membership" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can delete members" ON public.family_members;
DROP POLICY IF EXISTS "Users can delete own membership" ON public.family_members;
DROP POLICY IF EXISTS "Authenticated users can view family members" ON public.family_members;

-- Ensure RLS is enabled
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies with unique names
CREATE POLICY "view_family_members" ON public.family_members
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "insert_family_members" ON public.family_members
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "update_own_membership" ON public.family_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "delete_own_membership" ON public.family_members
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
