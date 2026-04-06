
-- Allow account admins to update profiles in their account (for approval)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update profiles in own account"
  ON public.profiles FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_account_admin())
  WITH CHECK (account_id = get_user_account_id() AND is_account_admin());
