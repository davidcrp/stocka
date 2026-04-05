
-- Create trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_sold_id UUID NOT NULL REFERENCES public.vehicles(id),
  vehicle_received_id UUID NOT NULL REFERENCES public.vehicles(id),
  trade_value NUMERIC NOT NULL DEFAULT 0,
  cash_difference NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view trades"
  ON public.trades FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own trades"
  ON public.trades FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own trades or managers"
  ON public.trades FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR is_manager_or_admin(auth.uid()));

CREATE POLICY "Users can delete own trades or managers"
  ON public.trades FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR is_manager_or_admin(auth.uid()));
