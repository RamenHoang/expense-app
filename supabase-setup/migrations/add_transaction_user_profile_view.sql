-- Create a function to get transaction with user profile
-- This is needed because transactions.user_id and profiles.id both reference auth.users(id)
-- but there's no direct FK between transactions and profiles

CREATE OR REPLACE FUNCTION get_transaction_with_profile(p_transaction_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  category_id UUID,
  type TEXT,
  amount NUMERIC,
  note TEXT,
  transaction_date DATE,
  receipt_url TEXT,
  family_id UUID,
  is_shared BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  category JSONB,
  user_profile JSONB
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.user_id,
    t.category_id,
    t.type,
    t.amount,
    t.note,
    t.transaction_date,
    t.receipt_url,
    t.family_id,
    t.is_shared,
    t.created_at,
    t.updated_at,
    CASE 
      WHEN c.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'icon', c.icon,
          'color', c.color,
          'type', c.type
        )
      ELSE NULL
    END as category,
    CASE 
      WHEN p.id IS NOT NULL THEN 
        jsonb_build_object(
          'id', p.id,
          'full_name', p.full_name
        )
      ELSE NULL
    END as user_profile
  FROM public.transactions t
  LEFT JOIN public.categories c ON t.category_id = c.id
  LEFT JOIN public.profiles p ON t.user_id = p.id
  WHERE t.id = p_transaction_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_transaction_with_profile(UUID) TO authenticated;
