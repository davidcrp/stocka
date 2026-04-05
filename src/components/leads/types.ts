export type Lead = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  status: string | null;
  proposed_value: number | null;
  notes: string | null;
  created_at: string;
  last_contact_at: string | null;
  vehicle_id: string | null;
  assigned_to: string | null;
  follow_up_count: number;
};

export type LeadInteraction = {
  id: string;
  lead_id: string;
  action_type: string;
  message: string | null;
  created_by: string | null;
  created_at: string;
};
