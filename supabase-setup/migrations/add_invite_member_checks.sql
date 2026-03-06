-- Function to check if user with email is already a family member
CREATE OR REPLACE FUNCTION public.is_email_family_member(
  p_family_id UUID,
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_member BOOLEAN;
BEGIN
  -- Get user ID from email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(p_email);
  
  -- If user doesn't exist, return false
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if user is already a member
  SELECT EXISTS(
    SELECT 1
    FROM public.family_members
    WHERE family_id = p_family_id
      AND user_id = v_user_id
      AND status = 'active'
  ) INTO v_is_member;
  
  RETURN v_is_member;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_email_family_member(UUID, TEXT) TO authenticated;

-- Add check constraint to prevent duplicate invitations
-- (This is a database-level safeguard)
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_invitation 
ON public.family_invitations(family_id, email) 
WHERE status = 'pending';
