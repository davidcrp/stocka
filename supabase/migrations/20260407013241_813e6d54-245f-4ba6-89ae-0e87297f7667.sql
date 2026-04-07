
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    INSERT INTO public.profiles (user_id, full_name, account_id, role, status, subscription_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      invite_record.account_id,
      invite_record.role,
      'approved',
      'trial'
    );

    -- Mark invitation as accepted
    UPDATE public.invitations SET status = 'accepted' WHERE id = invite_record.id;

    -- Create trial subscription
    INSERT INTO public.subscriptions (user_id, account_id, plan, status, trial_ends_at)
    VALUES (NEW.id, invite_record.account_id, 'pro', 'trial', now() + interval '7 days');
  ELSE
    -- No invitation: create new account
    INSERT INTO public.accounts (name)
    VALUES (COALESCE(NEW.raw_user_meta_data ->> 'business_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email) || '''s Business'))
    RETURNING id INTO new_account_id;

    INSERT INTO public.profiles (user_id, full_name, account_id, role, status, subscription_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      new_account_id,
      'admin',
      'approved',
      'trial'
    );

    -- Create trial subscription
    INSERT INTO public.subscriptions (user_id, account_id, plan, status, trial_ends_at)
    VALUES (NEW.id, new_account_id, 'pro', 'trial', now() + interval '7 days');
  END IF;

  RETURN NEW;
END;
$function$;
