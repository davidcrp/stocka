import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Plus,
  Car,
  Users,
  Target,
  ArrowUpRight,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Sale = {
  id: string;
  final_price: number;
  commission: number | null;
  payment_method: string | null;
  sale_date: string;
  notes: string | null;
  vehicle_id: string;
  lead_id: string | null;
  seller_id: string | null;
  vehicles: { brand: string; model: string; year_fab: number; purchase_price: number; reconditioning_cost: number | null } | null;
  leads: { name: string } | null;
};

type Vehicle = { id: string; brand: string; model: string; year_fab: number; purchase_price: number; reconditioning_cost: number | null; listing_price: number | null };
type Lead = { id: string; name: string };

const Vendas = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    vehicle_id: "",
    lead_id: "",
    final_price: 0,
    commission: 0,
    payment_method: "dinheiro",
    notes: "",
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [salesRes, vehiclesRes, leadsRes] = await Promise.all([
      supabase.from("sales").select("*, vehicles(brand, model, year_fab, purchase_price, reconditioning_cost), leads(name)").order("sale_date", { ascending: false }),
      supabase.from("vehicles").select("id, brand, model, year_fab, purchase_price, reconditioning_cost, listing_price").eq("status", "em_estoque"),
      supabase.from("leads").select("id, name"),
    ]);
    setSales((salesRes.data as any[]) || []);
    setVehicles((vehiclesRes.data as Vehicle[]) || []);
    setLeads((leadsRes.data as Lead[]) || []);
    setLoading(false);
  };

  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);
  const estimatedCost = selectedVehicle
    ? (selectedVehicle.purchase_price || 0) + (selectedVehicle.reconditioning_cost || 0)
    : 0;
  const estimatedProfit = form.final_price - estimatedCost - form.commission;

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id) {
      toast({ title: "Selecione um veículo", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("sales").insert({
      vehicle_id: form.vehicle_id,
      lead_id: form.lead_id || null,
      seller_id: user?.id || null,
      final_price: form.final_price,
      commission: form.commission,
      payment_method: form.payment_method,
      notes: form.notes || null,
    });

    if (error) {
      toast({ title: "Erro ao registrar venda", description: error.message, variant: "destructive" });
      return;
    }

    // Update vehicle status
    await supabase.from("vehicles").update({ status: "vendido" as const, sale_date: new Date().toISOString().split("T")[0], final_sale_price: form.final_price }).eq("id", form.vehicle_id);

    // Update lead status if linked
    if (form.lead_id) {
      await supabase.from("leads").update({ status: "fechado" as const }).eq("id", form.lead_id);
    }

    toast({ title: "Venda registrada com sucesso! 🎉" });
    setDialogOpen(false);
    setForm({ vehicle_id: "", lead_id: "", final_price: 0, commission: 0, payment_method: "dinheiro", notes: "" });
    fetchAll();
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalRevenue = sales.reduce((s, sale) => s + (sale.final_price || 0), 0);
  const totalProfit = sales.reduce((s, sale) => {
    const v = sale.vehicles;
    const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0);
    return s + (sale.final_price || 0) - cost - (sale.commission || 0);
  }, 0);
  const avgTicket = sales.length ? totalRevenue / sales.length : 0;
  const avgProfit = sales.length ? totalProfit / sales.length : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Vendas</h1>
          <p className="text-sm text-muted-foreground">{sales.length} vendas realizadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Registrar Venda
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Nova Venda</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSale} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Veículo *</label>
                <Select value={form.vehicle_id} onValueChange={(v) => {
                  const veh = vehicles.find((x) => x.id === v);
                  setForm({ ...form, vehicle_id: v, final_price: veh?.listing_price || 0 });
                }}>
                  <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} {v.year_fab}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cliente (opcional)</label>
                <Select value={form.lead_id} onValueChange={(v) => setForm({ ...form, lead_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Vincular lead" /></SelectTrigger>
                  <SelectContent>
                    {leads.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Preço Final (R$) *</label>
                  <Input type="number" value={form.final_price} onChange={(e) => setForm({ ...form, final_price: +e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Comissão (R$)</label>
                  <Input type="number" value={form.commission} onChange={(e) => setForm({ ...form, commission: +e.target.value })} />
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Forma de Pagamento</label>
                <Select value={form.payment_method} onValueChange={(v) => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="financiamento">Financiamento</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="troca">Troca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              {/* Profit Preview */}
              {selectedVehicle && (
                <div className="rounded-xl bg-secondary/30 border border-border/50 p-4 space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground">PRÉVIA DO LUCRO</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Custo total</span>
                    <span>{formatCurrency(estimatedCost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Preço de venda</span>
                    <span>{formatCurrency(form.final_price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Comissão</span>
                    <span>- {formatCurrency(form.commission)}</span>
                  </div>
                  <div className="border-t border-border/50 pt-2 flex justify-between">
                    <span className="text-sm font-semibold">Lucro estimado</span>
                    <span className={`text-lg font-display font-bold ${estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {formatCurrency(estimatedProfit)}
                    </span>
                  </div>
                </div>
              )}

              <Button type="submit" className="w-full bg-gradient-profit text-primary-foreground font-semibold shadow-glow">
                Confirmar Venda
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Faturamento</span>
          </div>
          <p className="font-display text-xl font-bold">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Lucro Total</span>
          </div>
          <p className="font-display text-xl font-bold text-gradient-profit">{formatCurrency(totalProfit)}</p>
        </Card>
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Ticket Médio</span>
          </div>
          <p className="font-display text-xl font-bold">{formatCurrency(avgTicket)}</p>
        </Card>
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">Lucro/Venda</span>
          </div>
          <p className={`font-display text-xl font-bold ${avgProfit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(avgProfit)}</p>
        </Card>
      </div>

      {sales.length === 0 ? (
        /* Empty State com Propósito */
        <div className="rounded-2xl bg-gradient-card border border-border/50 p-12 text-center shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">Comece a Lucrar</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Registre sua primeira venda para acompanhar lucro por veículo, performance dos vendedores e tendências do mercado.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button
              className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Registrar Primeira Venda
            </Button>
            <Button variant="outline" onClick={() => navigate("/estoque")}>
              <Car className="w-4 h-4 mr-2" /> Adicionar Veículo
            </Button>
          </div>

          {/* Mini Funnel Preview */}
          <div className="mt-8 grid grid-cols-4 gap-3 max-w-lg mx-auto">
            {[
              { icon: Users, label: "Leads", count: "→" },
              { icon: Target, label: "Negociação", count: "→" },
              { icon: DollarSign, label: "Fechamento", count: "→" },
              { icon: TrendingUp, label: "Lucro", count: "💰" },
            ].map((step, i) => (
              <div key={i} className="rounded-xl bg-secondary/30 border border-border/30 p-3 text-center">
                <step.icon className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Sales List */
        <div className="space-y-3">
          {sales.map((sale) => {
            const v = sale.vehicles;
            const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0);
            const profit = (sale.final_price || 0) - cost - (sale.commission || 0);
            const margin = sale.final_price > 0 ? (profit / sale.final_price) * 100 : 0;
            return (
              <Card key={sale.id} className="p-4 bg-gradient-card border-border/50 shadow-card hover:border-border transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{v?.brand} {v?.model} {v?.year_fab}</h3>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {sale.leads?.name && <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {sale.leads.name}</span>}
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(sale.sale_date).toLocaleDateString("pt-BR")}</span>
                      {sale.payment_method && <Badge variant="outline" className="text-xs">{sale.payment_method}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display font-bold text-lg">{formatCurrency(sale.final_price)}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <p className={`text-sm font-semibold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                        {profit >= 0 ? "+" : ""}{formatCurrency(profit)}
                      </p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        margin >= 20 ? "bg-primary/10 text-primary" : margin >= 10 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
                      }`}>
                        {margin.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Vendas;
