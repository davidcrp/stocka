
-- 1. Fix profiles UPDATE policy: prevent self-role-escalation
-- Drop existing user update policy and recreate with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND (
    -- Role must stay the same unless user is admin/gestor
    role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid())
    OR is_account_admin()
  )
);

-- 2. Fix is_manager_or_admin to scope by account
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id
      AND role IN ('gestor', 'admin')
      AND account_id = (SELECT account_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1)
  );
$$;

-- 3. Fix storage policies for vehicle-photos bucket
-- Drop overly permissive mutation policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update vehicle photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete vehicle photos" ON storage.objects;

-- Recreate with proper scoping
CREATE POLICY "Public read vehicle photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'vehicle-photos');

CREATE POLICY "Auth users upload vehicle photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-photos');

CREATE POLICY "Owners can update vehicle photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-photos' AND owner = auth.uid());

CREATE POLICY "Owners can delete vehicle photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-photos' AND owner = auth.uid());

-- 4. Add DELETE policy on profiles for admins
CREATE POLICY "Admins can delete profiles in own account"
ON public.profiles
FOR DELETE
TO authenticated
USING (account_id = get_user_account_id() AND is_account_admin());
