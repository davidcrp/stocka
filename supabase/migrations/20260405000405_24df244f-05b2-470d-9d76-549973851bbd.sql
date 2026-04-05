
-- Replace the managers update policy to remove WITH CHECK(true)
DROP POLICY IF EXISTS "Managers can update all leads" ON public.leads;
CREATE POLICY "Managers can update all leads"
ON public.leads FOR UPDATE
TO authenticated
USING (is_manager_or_admin(auth.uid()))
WITH CHECK (is_manager_or_admin(auth.uid()));
