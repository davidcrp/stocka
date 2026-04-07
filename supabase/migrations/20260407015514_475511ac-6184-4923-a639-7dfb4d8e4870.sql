
-- Update handle_new_user to give 10-min trial
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
  SELECT * INTO invite_record
  FROM public.invitations
  WHERE email = NEW.email
    AND status = 'pending'
    AND expires_at > now()
  LIMIT 1;

  IF invite_record IS NOT NULL THEN
    INSERT INTO public.profiles (user_id, full_name, account_id, role, status, subscription_status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
      invite_record.account_id,
      invite_record.role,
      'approved',
      'trial'
    );
    UPDATE public.invitations SET status = 'accepted' WHERE id = invite_record.id;

    INSERT INTO public.subscriptions (user_id, account_id, plan, status, trial_ends_at)
    VALUES (NEW.id, invite_record.account_id, 'pro', 'trial', now() + interval '10 minutes');
  ELSE
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

    INSERT INTO public.subscriptions (user_id, account_id, plan, status, trial_ends_at)
    VALUES (NEW.id, new_account_id, 'pro', 'trial', now() + interval '10 minutes');
  END IF;

  RETURN NEW;
END;
$function$;

-- Create function to expire trials
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Expire trial subscriptions past their end date
  UPDATE public.subscriptions
  SET status = 'inactive', updated_at = now()
  WHERE status = 'trial' AND trial_ends_at < now();

  -- Update corresponding profiles
  UPDATE public.profiles
  SET subscription_status = 'inactive'
  WHERE subscription_status = 'trial'
    AND user_id IN (
      SELECT user_id FROM public.subscriptions
      WHERE status = 'inactive' AND trial_ends_at < now()
    );
END;
$$;

-- Set trial_ends_at for existing trial users (10 min from now)
UPDATE public.subscriptions
SET trial_ends_at = now() + interval '10 minutes'
WHERE status = 'trial' AND trial_ends_at IS NULL;

-- Enable pg_cron and schedule trial expiration every minute
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

SELECT cron.schedule(
  'expire-trials',
  '* * * * *',
  $$SELECT public.expire_trials()$$
);
