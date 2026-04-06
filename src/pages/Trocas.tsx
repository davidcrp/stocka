import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeftRight, Plus, Car, DollarSign, TrendingUp, Calendar, ArrowRight, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Vehicle = {
  id: string; brand: string; model: string; year_fab: number; year_model: number;
  purchase_price: number; reconditioning_cost: number | null; transport_cost: number | null;
  listing_price: number | null; status: string;
};

type Trade = {
  id: string; trade_value: number; cash_difference: number; profit: number;
  notes: string | null; created_at: string;
  vehicle_sold: { brand: string; model: string; year_fab: number } | null;
  vehicle_received: { brand: string; model: string; year_fab: number } | null;
};

const emptyNewVehicle = {
  brand: "", model: "", year_fab: new Date().getFullYear(), year_model: new Date().getFullYear(),
  purchase_price: 0, reconditioning_cost: 0, transport_cost: 0, listing_price: 0,
};

const Trocas = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [vehicleSoldId, setVehicleSoldId] = useState("");
  const [receivedMode, setReceivedMode] = useState<"existing" | "new">("new");
  const [vehicleReceivedId, setVehicleReceivedId] = useState("");
  const [newVehicle, setNewVehicle] = useState(emptyNewVehicle);
  const [tradeValue, setTradeValue] = useState(0);
  const [cashDifference, setCashDifference] = useState(0);
  const [notes, setNotes] = useState("");
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["trocas-data"],
    queryFn: async () => {
      const [tradesRes, vehiclesRes, expensesRes] = await Promise.all([
        supabase.from("trades").select("*, vehicle_sold:vehicles!trades_vehicle_sold_id_fkey(brand,model,year_fab), vehicle_received:vehicles!trades_vehicle_received_id_fkey(brand,model,year_fab)").order("created_at", { ascending: false }),
        supabase.from("vehicles").select("id,brand,model,year_fab,year_model,purchase_price,reconditioning_cost,transport_cost,listing_price,status").eq("status", "em_estoque"),
        supabase.from("vehicle_expenses").select("vehicle_id,amount"),
      ]);
      const expensesByVehicle: Record<string, number> = {};
      (expensesRes.data || []).forEach((e: any) => {
        expensesByVehicle[e.vehicle_id] = (expensesByVehicle[e.vehicle_id] || 0) + (e.amount || 0);
      });
      return {
        trades: (tradesRes.data || []) as Trade[],
        vehicles: (vehiclesRes.data || []) as Vehicle[],
        expensesByVehicle,
      };
    },
    staleTime: 15_000,
  });

  const trades = data?.trades || [];
  const vehicles = data?.vehicles || [];
  const expensesByVehicle = data?.expensesByVehicle || {};

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["trocas-data"] });
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["vendas-data"] });
  };

  const selectedSold = vehicles.find((v) => v.id === vehicleSoldId);
  const soldCost = selectedSold
    ? (selectedSold.purchase_price || 0) + (selectedSold.reconditioning_cost || 0) + (selectedSold.transport_cost || 0) + (expensesByVehicle[vehicleSoldId] || 0)
    : 0;
  const salePrice = selectedSold?.listing_price || 0;

  // profit = (sale_price - cost_of_sold) + cash_difference
  // trade_value is what we're valuing the received car at (our cost basis)
  const estimatedProfit = salePrice - soldCost + cashDifference;

  const resetForm = () => {
    setStep(1);
    setVehicleSoldId("");
    setReceivedMode("new");
    setVehicleReceivedId("");
    setNewVehicle(emptyNewVehicle);
    setTradeValue(0);
    setCashDifference(0);
    setNotes("");
    setDialogOpen(false);
  };

  const handleSubmit = async () => {
    if (!vehicleSoldId) { toast({ title: "Selecione o veículo vendido", variant: "destructive" }); return; }
    setSubmitting(true);

    let receivedId = vehicleReceivedId;

    // Create new vehicle if needed
    if (receivedMode === "new") {
      if (!newVehicle.brand || !newVehicle.model) {
        toast({ title: "Preencha marca e modelo do veículo recebido", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      const { data: newV, error: newErr } = await supabase.from("vehicles").insert({
        brand: newVehicle.brand, model: newVehicle.model,
        year_fab: newVehicle.year_fab, year_model: newVehicle.year_model,
        purchase_price: tradeValue,
        reconditioning_cost: newVehicle.reconditioning_cost,
        transport_cost: newVehicle.transport_cost,
        listing_price: newVehicle.listing_price || 0,
        created_by: user?.id,
        status: "em_estoque" as const,
        account_id: profile?.account_id,
      }).select("id").single();

      if (newErr || !newV) {
        toast({ title: "Erro ao criar veículo", description: newErr?.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      receivedId = newV.id;
    }

    if (!receivedId) {
      toast({ title: "Selecione ou crie o veículo recebido", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Create trade record
    const { error: tradeErr } = await supabase.from("trades").insert({
      vehicle_sold_id: vehicleSoldId,
      vehicle_received_id: receivedId,
      trade_value: tradeValue,
      cash_difference: cashDifference,
      profit: estimatedProfit,
      notes: notes || null,
      created_by: user?.id,
      account_id: profile?.account_id,
    });

    if (tradeErr) {
      toast({ title: "Erro ao registrar troca", description: tradeErr.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Mark sold vehicle
    await supabase.from("vehicles").update({
      status: "vendido" as const,
      sale_date: new Date().toISOString().split("T")[0],
      final_sale_price: salePrice,
    }).eq("id", vehicleSoldId);

    // Also create a sale record for consistency
    await supabase.from("sales").insert({
      vehicle_id: vehicleSoldId,
      seller_id: user?.id || null,
      final_price: salePrice,
      commission: 0,
      payment_method: "troca",
      notes: `Troca — veículo recebido como parte do pagamento`,
      account_id: profile?.account_id,
    });

    toast({ title: "Troca registrada com sucesso! 🔁" });
    setSubmitting(false);
    resetForm();
    invalidateAll();
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const totalTradeProfit = trades.reduce((s, t) => s + (t.profit || 0), 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Trocas</h1>
          <p className="text-sm text-muted-foreground">{trades.length} trocas realizadas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Registrar Troca
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-primary" /> Nova Troca
              </DialogTitle>
            </DialogHeader>

            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-colors ${step >= s ? "bg-primary" : "bg-secondary"}`} />
                  <p className={`text-[10px] mt-1 ${step >= s ? "text-primary" : "text-muted-foreground"}`}>
                    {s === 1 ? "Veículo Vendido" : s === 2 ? "Veículo Recebido" : "Resumo"}
                  </p>
                </div>
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">Veículo que está sendo vendido *</label>
                  <Select value={vehicleSoldId} onValueChange={setVehicleSoldId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.length === 0 && <div className="px-3 py-2 text-xs text-muted-foreground">Nenhum veículo em estoque</div>}
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} {v.year_fab}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedSold && (
                  <Card className="p-4 border-border/50 bg-secondary/20">
                    <h4 className="font-display text-sm font-bold mb-2">{selectedSold.brand} {selectedSold.model} {selectedSold.year_fab}</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground text-xs">Custo total</span><p className="font-bold">{fmt(soldCost)}</p></div>
                      <div><span className="text-muted-foreground text-xs">Preço de venda</span><p className="font-bold text-primary">{fmt(salePrice)}</p></div>
                    </div>
                  </Card>
                )}

                <Button className="w-full" disabled={!vehicleSoldId} onClick={() => setStep(2)}>
                  Próximo →
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button onClick={() => setReceivedMode("new")}
                    className={`flex-1 rounded-xl p-3 border-2 text-sm font-medium transition-all ${receivedMode === "new" ? "border-primary bg-primary/5" : "border-border"}`}>
                    Novo Veículo
                  </button>
                  <button onClick={() => setReceivedMode("existing")}
                    className={`flex-1 rounded-xl p-3 border-2 text-sm font-medium transition-all ${receivedMode === "existing" ? "border-primary bg-primary/5" : "border-border"}`}>
                    Já no Estoque
                  </button>
                </div>

                {receivedMode === "existing" ? (
                  <Select value={vehicleReceivedId} onValueChange={setVehicleReceivedId}>
                    <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.filter((v) => v.id !== vehicleSoldId).map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} {v.year_fab}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Marca *</label>
                      <Input value={newVehicle.brand} onChange={(e) => setNewVehicle({ ...newVehicle, brand: e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Modelo *</label>
                      <Input value={newVehicle.model} onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Ano Fab.</label>
                      <Input type="number" value={newVehicle.year_fab} onChange={(e) => setNewVehicle({ ...newVehicle, year_fab: +e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Ano Modelo</label>
                      <Input type="number" value={newVehicle.year_model} onChange={(e) => setNewVehicle({ ...newVehicle, year_model: +e.target.value })} /></div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">Valor da troca (R$) — quanto vale o carro recebido</label>
                  <Input type="number" value={tradeValue} onChange={(e) => setTradeValue(+e.target.value)} className="text-lg font-bold" />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block font-medium">Diferença em dinheiro (R$)</label>
                  <p className="text-[10px] text-muted-foreground mb-1">Positivo = cliente pagou a mais • Negativo = você pagou ao cliente</p>
                  <Input type="number" value={cashDifference} onChange={(e) => setCashDifference(+e.target.value)} className="text-lg font-bold" />
                </div>

                {receivedMode === "new" && (
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Preço de revenda estimado (R$)</label>
                    <Input type="number" value={newVehicle.listing_price} onChange={(e) => setNewVehicle({ ...newVehicle, listing_price: +e.target.value })} />
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Voltar</Button>
                  <Button className="flex-1" onClick={() => setStep(3)}>Próximo →</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <Card className="p-5 border-primary/20 bg-primary/5 shadow-glow-sm">
                  <h4 className="font-display text-sm font-bold mb-4 flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-primary" /> Resumo da Troca
                  </h4>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 rounded-xl bg-card p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">VOCÊ ENTREGA</p>
                      <p className="font-display text-sm font-bold">{selectedSold?.brand} {selectedSold?.model}</p>
                      <p className="text-xs text-muted-foreground">{fmt(salePrice)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary shrink-0" />
                    <div className="flex-1 rounded-xl bg-card p-3 border border-border/50 text-center">
                      <p className="text-[10px] text-muted-foreground mb-1">VOCÊ RECEBE</p>
                      <p className="font-display text-sm font-bold">
                        {receivedMode === "new" ? `${newVehicle.brand} ${newVehicle.model}` : vehicles.find((v) => v.id === vehicleReceivedId)?.brand + " " + vehicles.find((v) => v.id === vehicleReceivedId)?.model}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmt(tradeValue)}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Preço do veículo vendido</span><span>{fmt(salePrice)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Custo do veículo vendido</span><span>- {fmt(soldCost)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Diferença em dinheiro</span>
                      <span className={cashDifference >= 0 ? "text-primary" : "text-destructive"}>{cashDifference >= 0 ? "+" : ""}{fmt(cashDifference)}</span>
                    </div>
                    <div className="border-t border-border/50 pt-2 flex justify-between items-center">
                      <span className="font-semibold">Lucro estimado</span>
                      <span className={`font-display text-xl font-extrabold ${estimatedProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                        {estimatedProfit >= 0 ? "+" : ""}{fmt(estimatedProfit)}
                      </span>
                    </div>
                  </div>
                </Card>

                <Input placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Voltar</Button>
                  <Button className="flex-1 bg-gradient-profit text-primary-foreground font-semibold shadow-glow" disabled={submitting} onClick={handleSubmit}>
                    {submitting ? "Registrando..." : "Confirmar Troca"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><ArrowLeftRight className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">Total de Trocas</p>
          <p className="font-display text-2xl font-extrabold">{trades.length}</p>
        </Card>
        <Card className="p-5 bg-gradient-card border-border/50 shadow-card border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">Lucro em Trocas</p>
          <p className={`font-display text-2xl font-extrabold ${totalTradeProfit >= 0 ? "text-gradient-profit" : "text-destructive"}`}>{fmt(totalTradeProfit)}</p>
        </Card>
        <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Car className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">Veículos Recebidos</p>
          <p className="font-display text-2xl font-extrabold">{trades.length}</p>
        </Card>
        <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><DollarSign className="w-4 h-4 text-primary" /></div>
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">Lucro Médio/Troca</p>
          <p className="font-display text-2xl font-extrabold">{trades.length > 0 ? fmt(totalTradeProfit / trades.length) : "R$0"}</p>
        </Card>
      </div>

      {/* Trades List */}
      {trades.length === 0 ? (
        <div className="rounded-2xl bg-gradient-card border border-border/50 p-12 text-center shadow-card">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 shadow-glow-sm">
            <ArrowLeftRight className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-xl font-extrabold mb-2">Nenhuma troca registrada</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Registre sua primeira troca para acompanhar o impacto financeiro e o fluxo de veículos.
          </p>
          <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Registrar Primeira Troca
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {trades.map((trade) => (
            <Card key={trade.id} className="p-5 bg-gradient-card border-border/50 shadow-card hover:border-primary/20 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <ArrowLeftRight className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-display font-bold text-sm">{trade.vehicle_sold?.brand} {trade.vehicle_sold?.model}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-display font-bold text-sm">{trade.vehicle_received?.brand} {trade.vehicle_received?.model}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(trade.created_at).toLocaleDateString("pt-BR")}</span>
                      <span>Troca: {fmt(trade.trade_value)}</span>
                      {trade.cash_difference !== 0 && <span>Diferença: {fmt(trade.cash_difference)}</span>}
                      <Badge variant="outline" className="text-[10px]">Troca</Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-display text-lg font-extrabold ${trade.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {trade.profit >= 0 ? "+" : ""}{fmt(trade.profit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">lucro</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Trocas;
