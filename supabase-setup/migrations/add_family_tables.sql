-- Create families table
CREATE TABLE IF NOT EXISTS public.families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create family_members table
CREATE TABLE IF NOT EXISTS public.family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'left')),
  UNIQUE(family_id, user_id)
);

-- Create family_invitations table
CREATE TABLE IF NOT EXISTS public.family_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add family columns to transactions table
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Add family columns to budgets table
ALTER TABLE public.budgets 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_family_members_family_id ON public.family_members(family_id);
CREATE INDEX IF NOT EXISTS idx_family_members_user_id ON public.family_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_family_id ON public.family_invitations(family_id);
CREATE INDEX IF NOT EXISTS idx_family_invitations_email ON public.family_invitations(email);
CREATE INDEX IF NOT EXISTS idx_family_invitations_token ON public.family_invitations(token);
CREATE INDEX IF NOT EXISTS idx_transactions_family_id ON public.transactions(family_id);
CREATE INDEX IF NOT EXISTS idx_budgets_family_id ON public.budgets(family_id);

-- Enable Row Level Security
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for families
CREATE POLICY "Users can view families they are members of" ON public.families
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = id AND status = 'active'
    )
  );

CREATE POLICY "Users can create families" ON public.families
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family owners can update their families" ON public.families
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = id AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Family owners can delete their families" ON public.families
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = id AND role = 'owner' AND status = 'active'
    )
  );

-- RLS Policies for family_members
CREATE POLICY "Users can view members of their families" ON public.family_members
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members AS fm 
      WHERE fm.family_id = family_id AND fm.status = 'active'
    )
  );

CREATE POLICY "Family owners can insert members" ON public.family_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = family_members.family_id AND role = 'owner' AND status = 'active'
    )
  );

CREATE POLICY "Family owners and admins can update members" ON public.family_members
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members AS fm
      WHERE fm.family_id = family_id AND fm.role IN ('owner', 'admin') AND fm.status = 'active'
    )
  );

CREATE POLICY "Users can update their own membership" ON public.family_members
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Family owners can delete members" ON public.family_members
  FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members AS fm
      WHERE fm.family_id = family_id AND fm.role = 'owner' AND fm.status = 'active'
    )
    OR auth.uid() = user_id
  );

-- RLS Policies for family_invitations
CREATE POLICY "Users can view invitations for their families" ON public.family_invitations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = family_invitations.family_id AND status = 'active'
    )
    OR auth.uid()::text = (SELECT id::text FROM auth.users WHERE email = family_invitations.email)
  );

CREATE POLICY "Family members can create invitations" ON public.family_invitations
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.family_members 
      WHERE family_id = family_invitations.family_id AND status = 'active'
    )
  );

CREATE POLICY "Users can update invitations they received" ON public.family_invitations
  FOR UPDATE
  USING (auth.uid()::text = (SELECT id::text FROM auth.users WHERE email = email));

-- Update RLS policies for transactions to include family access
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own and family transactions" ON public.transactions
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (
      is_shared = true 
      AND family_id IN (
        SELECT family_id FROM public.family_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Update RLS policies for budgets to include family access
DROP POLICY IF EXISTS "Users can view their own budgets" ON public.budgets;
CREATE POLICY "Users can view their own and family budgets" ON public.budgets
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR (
      is_shared = true 
      AND family_id IN (
        SELECT family_id FROM public.family_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- Function to automatically add creator as family owner
CREATE OR REPLACE FUNCTION public.add_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.family_members (family_id, user_id, role, status)
  VALUES (NEW.id, NEW.created_by, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_family_created
  AFTER INSERT ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.add_creator_as_owner();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_families_updated_at
  BEFORE UPDATE ON public.families
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
