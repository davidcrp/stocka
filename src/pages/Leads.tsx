import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { LeadCard } from "@/components/leads/LeadCard";
import { LeadForm, type LeadFormData } from "@/components/leads/LeadForm";
import type { Lead, LeadInteraction } from "@/components/leads/types";
import { differenceInHours, differenceInDays } from "date-fns";

const statusLabels: Record<string, string> = {
  novo: "Novo", contactado: "Contactado", aguardando: "Aguardando",
  negociando: "Negociando", fechado: "Fechado", perdido: "Perdido",
};

const emptyForm: LeadFormData = { name: "", phone: "", email: "", source: "outro", notes: "", proposed_value: 0 };

const Leads = () => {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<LeadFormData>(emptyForm);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
      return (data as Lead[]) || [];
    },
    staleTime: 15_000,
  });

  const { data: allInteractions = [] } = useQuery({
    queryKey: ["lead-interactions"],
    queryFn: async () => {
      const { data } = await supabase.from("lead_interactions").select("*").order("created_at", { ascending: false });
      return (data as LeadInteraction[]) || [];
    },
    staleTime: 15_000,
  });

  const interactionsByLead = useMemo(() => {
    const map: Record<string, LeadInteraction[]> = {};
    allInteractions.forEach((i) => {
      if (!map[i.lead_id]) map[i.lead_id] = [];
      map[i.lead_id].push(i);
    });
    return map;
  }, [allInteractions]);

  // Realtime: auto-refresh when new leads arrive via webhook
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        invalidateAll();
        toast.info("📱 Novo lead via WhatsApp!", { duration: 5000 });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["lead-interactions"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
  };

  // Stats
  const stats = useMemo(() => {
    const active = leads.filter(l => !["fechado", "perdido"].includes(l.status || ""));
    const now = new Date();
    let urgent = 0, waiting = 0, activeCount = 0;
    active.forEach(l => {
      const last = l.last_contact_at ? new Date(l.last_contact_at) : new Date(l.created_at);
      const hours = differenceInHours(now, last);
      const days = differenceInDays(now, last);
      if (l.status === "novo" && hours >= 2) urgent++;
      else if (days >= 1) waiting++;
      else activeCount++;
    });
    return { total: leads.length, active: active.length, urgent, waiting, activeCount };
  }, [leads]);

  const resetForm = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(false); };

  const openEdit = (l: Lead) => {
    setEditingId(l.id);
    setForm({ name: l.name, phone: l.phone || "", email: l.email || "", source: l.source || "outro", notes: l.notes || "", proposed_value: l.proposed_value || 0 });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    setSubmitting(true);
    const payload = {
      name: form.name.trim(), phone: form.phone || null, email: form.email || null,
      source: form.source as any, notes: form.notes || null, proposed_value: form.proposed_value || null,
    };
    let error;
    if (editingId) {
      ({ error } = await supabase.from("leads").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("leads").insert({ ...payload, assigned_to: user?.id || null }));
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); }
    else { toast.success(editingId ? "Lead atualizado!" : "Lead adicionado!"); resetForm(); invalidateAll(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Lead excluído"); invalidateAll(); }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status: status as any, last_contact_at: new Date().toISOString() }).eq("id", id);
    if (!error) {
      await supabase.from("lead_interactions").insert({
        lead_id: id, action_type: "status_change", message: `Status → ${statusLabels[status] || status}`, created_by: user?.id || null,
      });
      invalidateAll();
    } else toast.error(error.message);
  };

  const handleWhatsApp = async (lead: Lead, type: "contact" | "followup") => {
    if (!lead.phone) { toast.error("Lead sem telefone cadastrado"); return; }
    const phone = lead.phone.replace(/\D/g, "");
    const message = type === "contact"
      ? `Olá ${lead.name}! Estou entrando em contato sobre seu interesse em um veículo. Como posso ajudá-lo?`
      : `Olá ${lead.name}! Gostaria de saber se ainda tem interesse. Este veículo está com alta procura!`;

    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, "_blank");

    // Update lead
    const updates: any = { last_contact_at: new Date().toISOString() };
    if (type === "contact" && lead.status === "novo") updates.status = "contactado";
    if (type === "followup") updates.follow_up_count = (lead.follow_up_count || 0) + 1;
    
    await supabase.from("leads").update(updates).eq("id", lead.id);
    await supabase.from("lead_interactions").insert({
      lead_id: lead.id,
      action_type: type === "contact" ? "whatsapp_contact" : "whatsapp_followup",
      message,
      created_by: user?.id || null,
    });

    toast.success(type === "contact" ? "WhatsApp aberto! 📱" : "Follow-up enviado! 📤");
    invalidateAll();
  };

  const filtered = leads.filter((l) => {
    const matchSearch = `${l.name} ${l.phone || ""} ${l.email || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Central de Leads</h1>
          <p className="text-sm text-muted-foreground">Painel de controle para fechar negócios</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90"
              onClick={() => { setEditingId(null); setForm(emptyForm); }}>
              <Plus className="w-4 h-4 mr-2" /> Novo lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? "Editar Lead" : "Novo Lead"}</DialogTitle>
            </DialogHeader>
            <LeadForm form={form} onChange={setForm} onSubmit={handleSubmit} submitting={submitting} isEditing={!!editingId} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <p className="text-2xl font-bold text-red-400">{stats.urgent}</p>
          </div>
          <p className="text-xs text-muted-foreground">Urgentes</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400">{stats.waiting}</p>
          </div>
          <p className="text-xs text-muted-foreground">Aguardando</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <p className="text-2xl font-bold text-emerald-400">{stats.activeCount}</p>
          </div>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lead Cards */}
      <div className="space-y-3">
        {filtered.map((l) => (
          <LeadCard
            key={l.id}
            lead={l}
            onWhatsApp={handleWhatsApp}
            onStatusChange={updateStatus}
            onEdit={openEdit}
            onDelete={handleDelete}
            interactions={interactionsByLead[l.id] || []}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="mb-1 font-medium">Nenhum lead encontrado</p>
          <p className="text-sm mb-4">Adicione leads para começar a fechar negócios via WhatsApp</p>
          {leads.length === 0 && (
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar seu primeiro lead
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Leads;
