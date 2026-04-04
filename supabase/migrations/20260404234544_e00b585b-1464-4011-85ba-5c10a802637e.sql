
-- 1. Helper function to check if user is manager/admin
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND role IN ('gestor', 'admin')
  );
$$;

-- 2. Fix profiles UPDATE policy (prevent role self-escalation)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile no role change"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (
    role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
    OR public.is_manager_or_admin(auth.uid())
  )
);

-- 3. Fix vehicles policies
DROP POLICY IF EXISTS "Authenticated users can insert vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can update vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;

-- SELECT: all authenticated can view
CREATE POLICY "Authenticated users can view vehicles"
ON public.vehicles FOR SELECT
TO authenticated
USING (true);

-- INSERT: must set created_by to self
CREATE POLICY "Users can insert own vehicles"
ON public.vehicles FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- UPDATE: creator or manager/admin
CREATE POLICY "Users can update own vehicles"
ON public.vehicles FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- DELETE: creator or manager/admin
CREATE POLICY "Users can delete own vehicles"
ON public.vehicles FOR DELETE
TO authenticated
USING (created_by = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- 4. Fix sales policies
DROP POLICY IF EXISTS "Authenticated users can manage sales" ON public.sales;

CREATE POLICY "Authenticated users can view sales"
ON public.sales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own sales"
ON public.sales FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Users can update own sales"
ON public.sales FOR UPDATE
TO authenticated
USING (seller_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

CREATE POLICY "Users can delete own sales"
ON public.sales FOR DELETE
TO authenticated
USING (seller_id = auth.uid() OR public.is_manager_or_admin(auth.uid()));

-- 5. Fix vehicle_expenses policies
DROP POLICY IF EXISTS "Authenticated users can manage expenses" ON public.vehicle_expenses;

CREATE POLICY "Authenticated users can view expenses"
ON public.vehicle_expenses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert expenses for own vehicles"
ON public.vehicle_expenses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.created_by = auth.uid())
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "Users can update expenses for own vehicles"
ON public.vehicle_expenses FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.created_by = auth.uid())
  OR public.is_manager_or_admin(auth.uid())
);

CREATE POLICY "Users can delete expenses for own vehicles"
ON public.vehicle_expenses FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.vehicles v WHERE v.id = vehicle_id AND v.created_by = auth.uid())
  OR public.is_manager_or_admin(auth.uid())
);

-- 6. Fix storage policies for vehicle-photos
DROP POLICY IF EXISTS "Anyone can view vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle photos" ON storage.objects;

CREATE POLICY "Anyone can view vehicle photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Authenticated users can upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos');

CREATE POLICY "Users can update own vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-photos' AND owner = auth.uid());

CREATE POLICY "Users can delete own vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-photos' AND owner = auth.uid());
