
-- Add aguardando to lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'aguardando' AFTER 'contactado';

-- Add follow_up_count to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_count integer NOT NULL DEFAULT 0;

-- Create lead_interactions table for timeline
CREATE TABLE public.lead_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'whatsapp_contact', 'whatsapp_followup', 'status_change', 'note'
  message text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view interactions for own leads"
ON public.lead_interactions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_interactions.lead_id AND leads.assigned_to = auth.uid())
  OR is_manager_or_admin(auth.uid())
);

CREATE POLICY "Users can insert interactions for own leads"
ON public.lead_interactions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads WHERE leads.id = lead_interactions.lead_id AND leads.assigned_to = auth.uid())
  OR is_manager_or_admin(auth.uid())
);

CREATE INDEX idx_lead_interactions_lead_id ON public.lead_interactions(lead_id);
CREATE INDEX idx_lead_interactions_created_at ON public.lead_interactions(created_at DESC);
