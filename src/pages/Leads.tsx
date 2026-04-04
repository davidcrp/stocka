import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Users, Phone, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Lead = {
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
};

const statusColors: Record<string, string> = {
  novo: "bg-accent/10 text-accent",
  contactado: "bg-primary/10 text-primary",
  negociando: "bg-primary/20 text-primary",
  fechado: "bg-primary/10 text-primary",
  perdido: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  novo: "Novo",
  contactado: "Contactado",
  negociando: "Negociando",
  fechado: "Fechado",
  perdido: "Perdido",
};

const sourceLabels: Record<string, string> = {
  olx: "OLX",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  loja: "Loja",
  instagram: "Instagram",
  indicacao: "Indicação",
  outro: "Outro",
};

const Leads = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "", phone: "", email: "", source: "outro" as string, notes: "", proposed_value: 0,
  });

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    const { data } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
    setLeads((data as Lead[]) || []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("leads").insert({
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      source: form.source as any,
      notes: form.notes || null,
      proposed_value: form.proposed_value || null,
      assigned_to: user?.id || null,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Lead adicionado!" });
      setDialogOpen(false);
      setForm({ name: "", phone: "", email: "", source: "outro", notes: "", proposed_value: 0 });
      fetchLeads();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("leads").update({ status, last_contact_at: new Date().toISOString() }).eq("id", id);
    fetchLeads();
  };

  const filtered = leads.filter((l) => {
    const matchSearch = `${l.name} ${l.phone || ""} ${l.email || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} contatos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Novo lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Novo lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <Input placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                  <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(sourceLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Valor proposto" value={form.proposed_value} onChange={(e) => setForm({ ...form, proposed_value: +e.target.value })} />
              </div>
              <Input placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button type="submit" className="w-full bg-gradient-profit text-primary-foreground font-semibold">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
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

      <div className="space-y-3">
        {filtered.map((l) => (
          <Card key={l.id} className="p-4 bg-card border-border hover:border-primary/20 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold">{l.name}</h3>
                  <Badge className={statusColors[l.status || "novo"]}>{statusLabels[l.status || "novo"]}</Badge>
                  {l.source && <Badge variant="outline" className="text-xs">{sourceLabels[l.source] || l.source}</Badge>}
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {l.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{l.phone}</span>}
                  {l.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{l.email}</span>}
                  <span>{formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}</span>
                </div>
                {l.notes && <p className="text-sm text-muted-foreground mt-1">{l.notes}</p>}
              </div>
              <Select value={l.status || "novo"} onValueChange={(v) => updateStatus(l.id, v)}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(statusLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum lead encontrado</p>
        </div>
      )}
    </div>
  );
};

export default Leads;
