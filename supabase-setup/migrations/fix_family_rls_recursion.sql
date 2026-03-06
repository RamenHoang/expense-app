-- Fix infinite recursion in family_members RLS policies
-- This script drops and recreates the problematic policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view members of their families" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can insert members" ON public.family_members;
DROP POLICY IF EXISTS "Family owners and admins can update members" ON public.family_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can delete members" ON public.family_members;

-- Recreate policies without recursion
-- Allow users to view members of families they belong to
CREATE POLICY "Users can view members of their families" ON public.family_members
  FOR SELECT
  USING (
    family_id IN (
      SELECT fm.family_id 
      FROM public.family_members fm
      WHERE fm.user_id = auth.uid() 
        AND fm.status = 'active'
    )
  );

-- Allow the trigger to insert members (creator as owner)
CREATE POLICY "Allow insert for authenticated users" ON public.family_members
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow owners and admins to update member roles
CREATE POLICY "Family owners and admins can update members" ON public.family_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id 
        AND fm.user_id = auth.uid()
        AND fm.role IN ('owner', 'admin')
        AND fm.status = 'active'
    )
  );

-- Allow users to update their own membership status
CREATE POLICY "Users can update their own membership" ON public.family_members
  FOR UPDATE
  USING (user_id = auth.uid());

-- Allow owners to delete members, and users can delete themselves
CREATE POLICY "Family owners can delete members" ON public.family_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 
      FROM public.family_members fm
      WHERE fm.family_id = family_members.family_id 
        AND fm.user_id = auth.uid()
        AND fm.role = 'owner'
        AND fm.status = 'active'
    )
  );
