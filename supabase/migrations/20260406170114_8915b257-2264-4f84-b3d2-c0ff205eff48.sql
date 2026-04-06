
-- 1. Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

-- 2. Create user status enum
CREATE TYPE public.user_status AS ENUM ('pending', 'approved', 'rejected');

-- 3. Add account_id and status to profiles
ALTER TABLE public.profiles
  ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  ADD COLUMN status public.user_status NOT NULL DEFAULT 'pending';

-- 4. Add account_id to all data tables
ALTER TABLE public.vehicles ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.leads ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.sales ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.trades ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.vehicle_expenses ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE public.lead_interactions ADD COLUMN account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 5. Create security definer function to get current user's account_id
CREATE OR REPLACE FUNCTION public.get_user_account_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT account_id FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- 6. Create security definer function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND status = 'approved'
  );
$$;

-- 7. Create function to check if user is account admin
CREATE OR REPLACE FUNCTION public.is_account_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'gestor') AND status = 'approved'
  );
$$;

-- 8. RLS for accounts table
CREATE POLICY "Users can view own account"
  ON public.accounts FOR SELECT TO authenticated
  USING (id = get_user_account_id());

-- 9. Drop all existing RLS policies and recreate with account_id filtering

-- PROFILES policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own or managed profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile no role change" ON public.profiles;

CREATE POLICY "Users can view profiles in own account"
  ON public.profiles FOR SELECT TO authenticated
  USING (account_id = get_user_account_id());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- VEHICLES policies
DROP POLICY IF EXISTS "Authenticated users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can insert own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.vehicles;

CREATE POLICY "Users can view vehicles in own account"
  ON public.vehicles FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can insert vehicles in own account"
  ON public.vehicles FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can update vehicles in own account"
  ON public.vehicles FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can delete own vehicles or managers"
  ON public.vehicles FOR DELETE TO authenticated
  USING (account_id = get_user_account_id() AND ((created_by = auth.uid()) OR is_manager_or_admin(auth.uid())));

-- LEADS policies
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete own leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can view all leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can delete all leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can update all leads" ON public.leads;
DROP POLICY IF EXISTS "Managers can insert leads for any user" ON public.leads;

CREATE POLICY "Users can view leads in own account"
  ON public.leads FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can insert leads in own account"
  ON public.leads FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can update leads in own account"
  ON public.leads FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can delete leads in own account"
  ON public.leads FOR DELETE TO authenticated
  USING (account_id = get_user_account_id() AND ((assigned_to = auth.uid()) OR is_manager_or_admin(auth.uid())));

-- SALES policies
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales;

CREATE POLICY "Users can view sales in own account"
  ON public.sales FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can insert sales in own account"
  ON public.sales FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can update sales in own account"
  ON public.sales FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can delete sales in own account"
  ON public.sales FOR DELETE TO authenticated
  USING (account_id = get_user_account_id() AND ((seller_id = auth.uid()) OR is_manager_or_admin(auth.uid())));

-- TRADES policies
DROP POLICY IF EXISTS "Authenticated users can view trades" ON public.trades;
DROP POLICY IF EXISTS "Users can insert own trades" ON public.trades;
DROP POLICY IF EXISTS "Users can update own trades or managers" ON public.trades;
DROP POLICY IF EXISTS "Users can delete own trades or managers" ON public.trades;

CREATE POLICY "Users can view trades in own account"
  ON public.trades FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can insert trades in own account"
  ON public.trades FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can update trades in own account"
  ON public.trades FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can delete trades in own account"
  ON public.trades FOR DELETE TO authenticated
  USING (account_id = get_user_account_id() AND ((created_by = auth.uid()) OR is_manager_or_admin(auth.uid())));

-- VEHICLE_EXPENSES policies
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Users can insert expenses for own vehicles" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Users can update expenses for own vehicles" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "Users can delete expenses for own vehicles" ON public.vehicle_expenses;

CREATE POLICY "Users can view expenses in own account"
  ON public.vehicle_expenses FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can insert expenses in own account"
  ON public.vehicle_expenses FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can update expenses in own account"
  ON public.vehicle_expenses FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can delete expenses in own account"
  ON public.vehicle_expenses FOR DELETE TO authenticated
  USING (account_id = get_user_account_id() AND ((EXISTS (SELECT 1 FROM vehicles v WHERE v.id = vehicle_expenses.vehicle_id AND v.created_by = auth.uid())) OR is_manager_or_admin(auth.uid())));

-- LEAD_INTERACTIONS policies
DROP POLICY IF EXISTS "Users can view interactions for own leads" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can insert interactions for own leads" ON public.lead_interactions;
DROP POLICY IF EXISTS "Managers can update interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Managers can delete interactions" ON public.lead_interactions;

CREATE POLICY "Users can view interactions in own account"
  ON public.lead_interactions FOR SELECT TO authenticated
  USING (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Users can insert interactions in own account"
  ON public.lead_interactions FOR INSERT TO authenticated
  WITH CHECK (account_id = get_user_account_id() AND is_user_approved());

CREATE POLICY "Managers can update interactions in own account"
  ON public.lead_interactions FOR UPDATE TO authenticated
  USING (account_id = get_user_account_id() AND is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers can delete interactions in own account"
  ON public.lead_interactions FOR DELETE TO authenticated
  USING (account_id = get_user_account_id() AND is_manager_or_admin(auth.uid()));

-- 10. Update handle_new_user to create account and set user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create a new account for the user (each signup = new dealership)
  INSERT INTO public.accounts (name)
  VALUES (COALESCE(NEW.raw_user_meta_data ->> 'dealership_name', COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email) || '''s Dealership'))
  RETURNING id INTO new_account_id;

  -- Create profile with account_id, admin role, and approved status (first user = owner)
  INSERT INTO public.profiles (user_id, full_name, account_id, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    new_account_id,
    'admin',
    'approved'
  );

  RETURN NEW;
END;
$$;

-- 11. Backfill existing data: create accounts for existing users without one
DO $$
DECLARE
  p RECORD;
  new_account_id UUID;
BEGIN
  FOR p IN SELECT * FROM public.profiles WHERE account_id IS NULL LOOP
    INSERT INTO public.accounts (name) VALUES (COALESCE(p.full_name, 'Dealership') || '''s Account')
    RETURNING id INTO new_account_id;
    
    UPDATE public.profiles SET account_id = new_account_id, role = 'admin', status = 'approved' WHERE id = p.id;
    
    -- Update all data owned by this user
    UPDATE public.vehicles SET account_id = new_account_id WHERE created_by = p.user_id;
    UPDATE public.leads SET account_id = new_account_id WHERE assigned_to = p.user_id;
    UPDATE public.sales SET account_id = new_account_id WHERE seller_id = p.user_id;
    UPDATE public.trades SET account_id = new_account_id WHERE created_by = p.user_id;
  END LOOP;
END;
$$;
