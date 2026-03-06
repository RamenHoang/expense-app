-- Add family sharing support to categories table

-- Add columns for family sharing
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT false;

-- Create index for family queries
CREATE INDEX IF NOT EXISTS idx_categories_family_id ON public.categories(family_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_shared ON public.categories(is_shared);

-- Update RLS policies for categories to include family access
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can create their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

-- New policies that support family sharing
CREATE POLICY "Users can view own and family categories" ON public.categories
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR (
      is_shared = true 
      AND family_id IN (
        SELECT family_id FROM public.family_members 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can create categories" ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Add constraint to prevent duplicate category names within same scope
-- This is handled at application level for better UX (show error message)
