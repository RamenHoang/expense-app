-- Fix families RLS policies

-- Drop existing families policies
DROP POLICY IF EXISTS "Users can view families they are members of" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Family owners can update their families" ON public.families;
DROP POLICY IF EXISTS "Family owners can delete their families" ON public.families;

-- Simple policies for families table
CREATE POLICY "authenticated_view_families" ON public.families
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_create_families" ON public.families
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "authenticated_update_families" ON public.families
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "authenticated_delete_families" ON public.families
  FOR DELETE
  TO authenticated
  USING (true);
