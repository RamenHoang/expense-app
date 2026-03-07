-- Create a function to get user email by user_id
-- This is needed because auth.users is not directly accessible from the client
CREATE OR REPLACE FUNCTION public.get_user_email(p_user_id UUID)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  RETURN user_email;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_user_email(UUID) IS 'Returns the email address for a given user ID';
