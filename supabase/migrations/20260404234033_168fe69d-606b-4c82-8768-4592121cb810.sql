
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON public.leads;

-- SELECT: only own leads
CREATE POLICY "Users can view own leads"
ON public.leads FOR SELECT
TO authenticated
USING (assigned_to = auth.uid());

-- INSERT: must assign to self
CREATE POLICY "Users can insert own leads"
ON public.leads FOR INSERT
TO authenticated
WITH CHECK (assigned_to = auth.uid());

-- UPDATE: only own leads
CREATE POLICY "Users can update own leads"
ON public.leads FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid())
WITH CHECK (assigned_to = auth.uid());

-- DELETE: only own leads
CREATE POLICY "Users can delete own leads"
ON public.leads FOR DELETE
TO authenticated
USING (assigned_to = auth.uid());
