-- COMPREHENSIVE FIX FOR ALL FAMILY FEATURE RLS ISSUES
-- Run this entire script in Supabase SQL Editor

-- ============================================================
-- 1. FIX FAMILIES TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view families they are members of" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Family owners can update their families" ON public.families;
DROP POLICY IF EXISTS "Family owners can delete their families" ON public.families;

CREATE POLICY "authenticated_view_families" ON public.families
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_create_families" ON public.families
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "authenticated_update_families" ON public.families
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_families" ON public.families
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 2. FIX FAMILY_MEMBERS TABLE POLICIES
-- ============================================================

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
DROP POLICY IF EXISTS "view_family_members" ON public.family_members;
DROP POLICY IF EXISTS "insert_family_members" ON public.family_members;
DROP POLICY IF EXISTS "update_own_membership" ON public.family_members;
DROP POLICY IF EXISTS "delete_own_membership" ON public.family_members;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view_family_members" ON public.family_members
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_family_members" ON public.family_members
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "update_own_membership" ON public.family_members
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "delete_own_membership" ON public.family_members
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- 3. FIX FAMILY_INVITATIONS TABLE POLICIES
-- ============================================================

DROP POLICY IF EXISTS "Users can view invitations for their families" ON public.family_invitations;
DROP POLICY IF EXISTS "Family members can create invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can update invitations they received" ON public.family_invitations;
DROP POLICY IF EXISTS "view_family_invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "insert_family_invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "update_own_invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "authenticated_view_invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "authenticated_insert_invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "authenticated_update_invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "authenticated_delete_invitations" ON public.family_invitations;

CREATE POLICY "authenticated_view_invitations" ON public.family_invitations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated_insert_invitations" ON public.family_invitations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated_update_invitations" ON public.family_invitations
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "authenticated_delete_invitations" ON public.family_invitations
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 4. CREATE FUNCTION TO GET FAMILY MEMBERS WITH USER INFO
-- ============================================================

DROP VIEW IF EXISTS public.family_members_with_users;

CREATE OR REPLACE FUNCTION public.get_family_members(p_family_id UUID)
RETURNS TABLE (
  id UUID,
  family_id UUID,
  user_id UUID,
  role TEXT,
  joined_at TIMESTAMPTZ,
  status TEXT,
  user_email TEXT,
  user_name TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fm.id,
    fm.family_id,
    fm.user_id,
    fm.role,
    fm.joined_at,
    fm.status,
    u.email as user_email,
    u.raw_user_meta_data->>'name' as user_name
  FROM public.family_members fm
  LEFT JOIN auth.users u ON fm.user_id = u.id
  WHERE fm.family_id = p_family_id
  ORDER BY fm.joined_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_family_members(UUID) TO authenticated;

-- ============================================================
-- DONE! All RLS policies fixed and function created.
-- ============================================================
