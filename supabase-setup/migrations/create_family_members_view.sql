-- Create a view that joins family_members with auth.users
-- This allows us to query member information with user emails

CREATE OR REPLACE VIEW public.family_members_with_users AS
SELECT 
  fm.*,
  u.email as user_email,
  u.raw_user_meta_data->>'name' as user_name
FROM public.family_members fm
LEFT JOIN auth.users u ON fm.user_id = u.id;

-- Grant access to authenticated users
GRANT SELECT ON public.family_members_with_users TO authenticated;

-- Enable RLS on the view (inherits from base table)
ALTER VIEW public.family_members_with_users SET (security_invoker = true);
