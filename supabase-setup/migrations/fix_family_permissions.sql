-- Fix family permissions - only owner and admin should have management rights

-- Fix family_invitations INSERT policy to require owner or admin
DROP POLICY IF EXISTS "Family members can create invitations" ON public.family_invitations;

CREATE POLICY "Family owners and admins can create invitations" ON public.family_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = family_invitations.family_id 
        AND (role = 'owner' OR role = 'admin')
        AND status = 'active'
    )
  );

-- Fix family_members INSERT policy (already correct, but let's ensure)
DROP POLICY IF EXISTS "Family owners can add members" ON public.family_members;

CREATE POLICY "Family owners and admins can add members" ON public.family_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.family_members AS fm
      WHERE fm.family_id = family_members.family_id 
        AND (fm.role = 'owner' OR fm.role = 'admin')
        AND fm.status = 'active'
    )
  );

-- Ensure family_members UPDATE policy is correct
DROP POLICY IF EXISTS "Family owners and admins can update members" ON public.family_members;

CREATE POLICY "Family owners and admins can update members" ON public.family_members
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members AS fm
      WHERE fm.family_id = family_id 
        AND (fm.role = 'owner' OR fm.role = 'admin')
        AND fm.status = 'active'
    )
  );

-- Ensure family_members DELETE policy is correct
DROP POLICY IF EXISTS "Family owners can delete members" ON public.family_members;

CREATE POLICY "Family owners and admins can delete members" ON public.family_members
  FOR DELETE
  USING (
    -- Owner/admin can delete others, or users can delete themselves
    auth.uid() IN (
      SELECT user_id FROM public.family_members AS fm
      WHERE fm.family_id = family_id 
        AND (fm.role = 'owner' OR fm.role = 'admin')
        AND fm.status = 'active'
    )
    OR auth.uid() = user_id  -- Users can remove themselves (leave family)
  );

-- Add comments for clarity
COMMENT ON POLICY "Family owners and admins can create invitations" ON public.family_invitations IS 
  'Only family owners and admins can invite new members';

COMMENT ON POLICY "Family owners and admins can add members" ON public.family_members IS 
  'Only family owners and admins can add new members';

COMMENT ON POLICY "Family owners and admins can update members" ON public.family_members IS 
  'Only family owners and admins can update member roles';

COMMENT ON POLICY "Family owners and admins can delete members" ON public.family_members IS 
  'Only family owners and admins can remove members, or users can leave by themselves';
