-- Add superadmin flag to profiles
ALTER TABLE public.profiles ADD COLUMN is_superadmin boolean NOT NULL DEFAULT false;

-- Mark the owner as superadmin
ALTER TABLE public.profiles DISABLE TRIGGER prevent_role_change_trigger;
UPDATE public.profiles SET is_superadmin = true, role = 'admin' WHERE user_id = 'a5904f9e-fd63-4ea2-b701-cc071f474f5b';
ALTER TABLE public.profiles ENABLE TRIGGER prevent_role_change_trigger;

-- Security definer function to check superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_superadmin = true
  )
$$;

-- Allow superadmin to view ALL profiles (not just own account)
CREATE POLICY "Superadmin can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (is_superadmin());

-- Allow superadmin to update ALL profiles
CREATE POLICY "Superadmin can update all profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (is_superadmin());

-- Allow superadmin to view ALL accounts
CREATE POLICY "Superadmin can view all accounts"
ON public.accounts FOR SELECT TO authenticated
USING (is_superadmin());

-- Allow superadmin to insert accounts
CREATE POLICY "Superadmin can insert accounts"
ON public.accounts FOR INSERT TO authenticated
WITH CHECK (is_superadmin());

-- Allow superadmin to update accounts
CREATE POLICY "Superadmin can update accounts"
ON public.accounts FOR UPDATE TO authenticated
USING (is_superadmin());

-- Function to create a new account (loja)
CREATE OR REPLACE FUNCTION public.admin_create_account(_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can create accounts';
  END IF;
  INSERT INTO public.accounts (name) VALUES (_name) RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

-- Function to move a user to another account and change role
CREATE OR REPLACE FUNCTION public.admin_update_user(_target_user_id uuid, _account_id uuid, _role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Only superadmins can move users';
  END IF;
  UPDATE public.profiles
  SET account_id = _account_id, role = _role, updated_at = now()
  WHERE user_id = _target_user_id;
END;
$$;