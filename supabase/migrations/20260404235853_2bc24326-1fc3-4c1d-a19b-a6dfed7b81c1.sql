
-- Fix 1: Restrict INSERT on profiles to prevent role escalation on signup
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (role IS NULL OR role = 'vendedor')
);

-- Fix 2: Allow managers/admins to SELECT all leads
CREATE POLICY "Managers can view all leads"
ON public.leads FOR SELECT
TO authenticated
USING (is_manager_or_admin(auth.uid()));

-- Also allow managers/admins to update/delete any lead
CREATE POLICY "Managers can update all leads"
ON public.leads FOR UPDATE
TO authenticated
USING (is_manager_or_admin(auth.uid()))
WITH CHECK (true);

CREATE POLICY "Managers can delete all leads"
ON public.leads FOR DELETE
TO authenticated
USING (is_manager_or_admin(auth.uid()));
