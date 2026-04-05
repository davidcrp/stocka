
-- 1. Allow managers to insert leads assigned to other users
CREATE POLICY "Managers can insert leads for any user"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (is_manager_or_admin(auth.uid()));

-- 2. Create a secure function to change user roles (admin-only)
CREATE OR REPLACE FUNCTION public.change_user_role(_target_user_id uuid, _new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Only managers or admins can change roles';
  END IF;
  
  IF _new_role NOT IN ('vendedor', 'gestor', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: %', _new_role;
  END IF;

  UPDATE public.profiles
  SET role = _new_role, updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.change_user_role(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.change_user_role(uuid, text) TO authenticated;

-- 3. Replace profile update policy to completely block role changes via direct UPDATE
DROP POLICY IF EXISTS "Users can update own profile no role change" ON public.profiles;
CREATE POLICY "Users can update own profile no role change"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
);
