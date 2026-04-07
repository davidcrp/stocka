
-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM ('inactive', 'trial', 'active', 'overdue');

-- Add subscription_status to profiles
ALTER TABLE public.profiles 
ADD COLUMN subscription_status public.subscription_status NOT NULL DEFAULT 'inactive';

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES public.accounts(id),
  asaas_customer_id text,
  asaas_subscription_id text,
  plan text NOT NULL DEFAULT 'pro',
  status public.subscription_status NOT NULL DEFAULT 'inactive',
  trial_ends_at timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
ON public.subscriptions FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
ON public.subscriptions FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Service role policy for webhooks
CREATE POLICY "Service role full access"
ON public.subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing users to trial with 7-day trial
UPDATE public.profiles SET subscription_status = 'trial';
