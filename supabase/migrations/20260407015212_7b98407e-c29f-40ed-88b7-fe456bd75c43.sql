
-- 1. Fix profiles INSERT: prevent self-escalation on creation
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND role = 'vendedor'
  AND status = 'pending'
  AND is_superadmin = false
);

-- 2. Fix storage INSERT: only approved users can upload
DROP POLICY IF EXISTS "Auth users upload vehicle photos" ON storage.objects;

CREATE POLICY "Approved users upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos' AND is_user_approved());
