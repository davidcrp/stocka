
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'vendedor' CHECK (role IN ('gerente', 'vendedor')),
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ VEHICLES ============
CREATE TYPE public.vehicle_status AS ENUM ('em_estoque', 'vendido', 'reservado');

CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year_fab INTEGER NOT NULL,
  year_model INTEGER NOT NULL,
  plate TEXT,
  color TEXT,
  mileage INTEGER DEFAULT 0,
  fuel TEXT DEFAULT 'flex',
  transmission TEXT DEFAULT 'manual',
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  reconditioning_cost NUMERIC(12,2) DEFAULT 0,
  suggested_price NUMERIC(12,2) DEFAULT 0,
  listing_price NUMERIC(12,2) DEFAULT 0,
  final_sale_price NUMERIC(12,2),
  status vehicle_status DEFAULT 'em_estoque',
  photos TEXT[] DEFAULT '{}',
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_date DATE,
  notes TEXT,
  fipe_code TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_entry_date ON public.vehicles(entry_date);

-- ============ LEADS ============
CREATE TYPE public.lead_status AS ENUM ('novo', 'contactado', 'negociando', 'fechado', 'perdido');
CREATE TYPE public.lead_source AS ENUM ('olx', 'facebook', 'whatsapp', 'loja', 'instagram', 'indicacao', 'outro');

CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  source lead_source DEFAULT 'outro',
  status lead_status DEFAULT 'novo',
  assigned_to UUID REFERENCES auth.users(id),
  proposed_value NUMERIC(12,2),
  notes TEXT,
  last_contact_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view leads" ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads" ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads" ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete leads" ON public.leads FOR DELETE TO authenticated USING (true);
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned ON public.leads(assigned_to);

-- ============ VEHICLE EXPENSES ============
CREATE TABLE public.vehicle_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  expense_type TEXT NOT NULL CHECK (expense_type IN ('ipva', 'seguro', 'manutencao', 'documentacao', 'multa', 'outro')),
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicle_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage expenses" ON public.vehicle_expenses FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============ SALES ============
CREATE TABLE public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id),
  final_price NUMERIC(12,2) NOT NULL,
  payment_method TEXT DEFAULT 'dinheiro',
  commission NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage sales" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_sales_seller ON public.sales(seller_id);

-- ============ STORAGE for vehicle photos ============
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true);
CREATE POLICY "Anyone can view vehicle photos" ON storage.objects FOR SELECT USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Authenticated users can upload vehicle photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-photos');
CREATE POLICY "Authenticated users can update vehicle photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Authenticated users can delete vehicle photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-photos');
