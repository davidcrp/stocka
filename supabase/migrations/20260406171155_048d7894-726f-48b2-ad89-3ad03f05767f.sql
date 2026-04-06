
-- Create invitations table
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'vendedor',
  token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  invited_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Prevent duplicate pending invitations for same email+account
CREATE UNIQUE INDEX idx_invitations_pending_email ON public.invitations (account_id, email) WHERE status = 'pending';

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view invitations in own account"
  ON public.invitations FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_account_admin());

CREATE POLICY "Admins can create invitations in own account"
  ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_account_admin());

CREATE POLICY "Admins can update invitations in own account"
  ON public.invitations FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_account_admin());

-- Update handle_new_user to check for pending invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id UUID;
  invite_record RECORD;
BEGIN
  -- Check for a pending invitation
  SELECT * INTO invite_record
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    -- User was invited: join existing account
    INSERT INTO public.profiles (user_id, full_name, account_id, role, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      invite_record.account_id,
      invite_record.role,
      'approved'
    );

    -- Mark invitation as accepted
    UPDATE public.invitations SET status = 'accepted' WHERE id = invite_record.id;
  ELSE
    -- No invitation: create new account
    INSERT INTO public.accounts (name)
    VALUES (COALESCE(NEW.raw_user_meta_data ->> 'dealership_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email) || '''s Dealership'))
    RETURNING id INTO new_account_id;

    INSERT INTO public.profiles (user_id, full_name, account_id, role, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      new_account_id,
      'admin',
      'approved'
    );
  END IF;

  RETURN NEW;
END;
$$;
