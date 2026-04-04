
-- Restrict is_manager_or_admin to authenticated role only
REVOKE ALL ON FUNCTION public.is_manager_or_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager_or_admin(uuid) TO authenticated;

-- Add documentation comment
COMMENT ON FUNCTION public.is_manager_or_admin(uuid) IS 'SECURITY DEFINER: Required to bypass RLS on profiles table for role checks in RLS policies. Returns boolean only. Input is always auth.uid() from policy context.';
