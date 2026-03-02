-- Rollback migration for family sharing feature
-- Run this script to completely remove family feature from database

-- Drop triggers first
DROP TRIGGER IF EXISTS update_families_updated_at ON public.families;
DROP TRIGGER IF EXISTS on_family_created ON public.families;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.add_creator_as_owner();

-- Drop RLS policies for transactions
DROP POLICY IF EXISTS "Users can view their own and family transactions" ON public.transactions;

-- Recreate original transaction policy
CREATE POLICY "Users can view their own transactions" ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Drop RLS policies for budgets
DROP POLICY IF EXISTS "Users can view their own and family budgets" ON public.budgets;

-- Recreate original budget policy
CREATE POLICY "Users can view their own budgets" ON public.budgets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Drop RLS policies for family_invitations
DROP POLICY IF EXISTS "Users can update invitations they received" ON public.family_invitations;
DROP POLICY IF EXISTS "Family members can create invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their families" ON public.family_invitations;

-- Drop RLS policies for family_members
DROP POLICY IF EXISTS "Family owners can delete members" ON public.family_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON public.family_members;
DROP POLICY IF EXISTS "Family owners and admins can update members" ON public.family_members;
DROP POLICY IF EXISTS "Family owners can insert members" ON public.family_members;
DROP POLICY IF EXISTS "Users can view members of their families" ON public.family_members;

-- Drop RLS policies for families
DROP POLICY IF EXISTS "Family owners can delete their families" ON public.families;
DROP POLICY IF EXISTS "Family owners can update their families" ON public.families;
DROP POLICY IF EXISTS "Users can create families" ON public.families;
DROP POLICY IF EXISTS "Users can view families they are members of" ON public.families;

-- Drop indexes
DROP INDEX IF EXISTS idx_budgets_family_id;
DROP INDEX IF EXISTS idx_transactions_family_id;
DROP INDEX IF EXISTS idx_family_invitations_token;
DROP INDEX IF EXISTS idx_family_invitations_email;
DROP INDEX IF EXISTS idx_family_invitations_family_id;
DROP INDEX IF EXISTS idx_family_members_user_id;
DROP INDEX IF EXISTS idx_family_members_family_id;

-- Remove family columns from budgets table
ALTER TABLE public.budgets 
DROP COLUMN IF EXISTS is_shared,
DROP COLUMN IF EXISTS family_id;

-- Remove family columns from transactions table
ALTER TABLE public.transactions 
DROP COLUMN IF EXISTS is_shared,
DROP COLUMN IF EXISTS family_id;

-- Drop family tables (order matters due to foreign keys)
DROP TABLE IF EXISTS public.family_invitations;
DROP TABLE IF EXISTS public.family_members;
DROP TABLE IF EXISTS public.families;

-- Verify tables are dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('families', 'family_members', 'family_invitations')
  ) THEN
    RAISE NOTICE 'Warning: Some family tables still exist!';
  ELSE
    RAISE NOTICE 'Success: All family tables have been dropped.';
  END IF;
END $$;
