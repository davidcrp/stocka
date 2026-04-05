
-- 1. Restrict profiles SELECT to own profile or managers/admins
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view own or managed profiles"
ON public.profiles FOR SELECT
TO authenticated
USING ((auth.uid() = user_id) OR is_manager_or_admin(auth.uid()));

-- 2. Restrict storage upload to vehicle owners or managers
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'vehicle-photos'
  AND (
    EXISTS (
      SELECT 1 FROM public.vehicles v
      WHERE v.id::text = (storage.foldername(name))[1]
        AND v.created_by = auth.uid()
    )
    OR is_manager_or_admin(auth.uid())
  )
);
