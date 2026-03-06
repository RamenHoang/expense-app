-- Drop the view if it exists
DROP VIEW IF EXISTS public.family_members_with_users;

-- Create a function to get family members with user info
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_family_members(UUID) TO authenticated;
