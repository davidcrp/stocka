import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Package, Calendar, DollarSign, TrendingUp, Zap, AlertTriangle, Pencil, Trash2, Upload, Tag, ArrowDown, ArrowUp, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";
import SellVehicleDialog from "@/components/SellVehicleDialog";

type Vehicle = {
  id: string; brand: string; model: string; year_fab: number; year_model: number;
  plate: string | null; color: string | null; mileage: number | null;
  fuel: string | null; transmission: string | null; purchase_price: number;
  reconditioning_cost: number | null; transport_cost: number | null;
  listing_price: number | null; suggested_price: number | null;
  status: "em_estoque" | "vendido" | "reservado";
  entry_date: string; notes: string | null; photos: string[] | null;
  custom_fields: Record<string, any> | null;
};

const statusColors: Record<string, string> = {
  em_estoque: "bg-primary/10 text-primary", vendido: "bg-muted text-muted-foreground", reservado: "bg-accent/10 text-accent",
};
const statusLabels: Record<string, string> = {
  em_estoque: "Em estoque", vendido: "Vendido", reservado: "Reservado",
};

const emptyForm = {
  brand: "", model: "", year_fab: new Date().getFullYear(), year_model: new Date().getFullYear(),
  plate: "", color: "", mileage: 0, fuel: "flex", transmission: "manual",
  purchase_price: 0, reconditioning_cost: 0, transport_cost: 0, listing_price: 0, desired_margin: 20, notes: "",
  custom_fields: {} as Record<string, any>,
};

const Estoque = () => {
  const navigate = useNavigate();
  const { labels, customFields, businessType } = useBusiness();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("days_desc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sellVehicle, setSellVehicle] = useState<Vehicle | null>(null);

  const [form, setForm] = useState(emptyForm);

  const { data: vehicles = [], isLoading: loading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
      return (data as Vehicle[]) || [];
    },
    staleTime: 15_000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["vendas-data"] });
  };

  const totalCost = form.purchase_price + form.reconditioning_cost + form.transport_cost;
  const suggestedPrice = totalCost > 0 ? Math.round(totalCost * (1 + form.desired_margin / 100)) : 0;
  const expectedProfit = (form.listing_price || suggestedPrice) - totalCost;

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    const cost = v.purchase_price + (v.reconditioning_cost || 0) + (v.transport_cost || 0);
    const margin = cost > 0 && v.listing_price ? Math.round(((v.listing_price - cost) / cost) * 100) : 20;
    setForm({
      brand: v.brand, model: v.model, year_fab: v.year_fab, year_model: v.year_model,
      plate: v.plate || "", color: v.color || "", mileage: v.mileage || 0,
      fuel: v.fuel || "flex", transmission: v.transmission || "manual",
      purchase_price: v.purchase_price, reconditioning_cost: v.reconditioning_cost || 0,
      transport_cost: v.transport_cost || 0,
      listing_price: v.listing_price || 0, desired_margin: margin, notes: v.notes || "",
      custom_fields: (v.custom_fields as Record<string, any>) || {},
    });
    setFormStep(1);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormStep(1);
    setDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload: any = {
      brand: form.brand, model: form.model, year_fab: form.year_fab, year_model: form.year_model,
      plate: form.plate || null, color: form.color || null, mileage: form.mileage,
      fuel: form.fuel, transmission: form.transmission, purchase_price: form.purchase_price,
      reconditioning_cost: form.reconditioning_cost, transport_cost: form.transport_cost,
      listing_price: form.listing_price || suggestedPrice, suggested_price: suggestedPrice,
      notes: form.notes || null,
      custom_fields: form.custom_fields,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("vehicles").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("vehicles").insert({ ...payload, created_by: user?.id, account_id: profile?.account_id }));
    }

    setSubmitting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? `${labels.itemSingular} atualizado! ✅` : `${labels.itemSingular} adicionado! 📦` });
      resetForm();
      invalidateAll();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${labels.itemSingular} excluído` });
      invalidateAll();
    }
  };

  const handleOpenSell = useCallback((v: Vehicle, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSellVehicle(v);
  }, []);

  const handlePhotoUpload = async (vehicleId: string, files: FileList) => {
    setUploadingPhotos(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${vehicleId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("vehicle-photos").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    if (newUrls.length > 0) {
      const vehicle = vehicles.find((v) => v.id === vehicleId);
      const existing = vehicle?.photos || [];
      await supabase.from("vehicles").update({ photos: [...existing, ...newUrls] }).eq("id", vehicleId);
      toast({ title: `${newUrls.length} foto(s) enviada(s)! 📸` });
      invalidateAll();
    }
    setUploadingPhotos(false);
  };

  const enriched = vehicles.map((v) => {
    const days = differenceInDays(new Date(), new Date(v.entry_date));
    const cost = v.purchase_price + (v.reconditioning_cost || 0) + (v.transport_cost || 0);
    const profit = (v.listing_price || 0) - cost;
    const margin = (v.listing_price || 0) > 0 ? (profit / (v.listing_price || 1)) * 100 : 0;
    const agingStatus: "green" | "yellow" | "red" = days < 15 ? "green" : days < 30 ? "yellow" : "red";

    let suggestion = "";
    let suggestionIcon: "up" | "down" | "promo" | null = null;
    if (v.status === "em_estoque") {
      if (days >= 30 && margin > 15) { suggestion = "Reduza o preço agora"; suggestionIcon = "down"; }
      else if (days >= 30 && margin <= 15) { suggestion = "Promova urgentemente"; suggestionIcon = "promo"; }
      else if (days >= 15 && margin > 25) { suggestion = "Considere reduzir preço"; suggestionIcon = "down"; }
      else if (days < 15 && margin > 20) { suggestion = "Pode aumentar preço"; suggestionIcon = "up"; }
    }

    return { ...v, days, cost, profit, margin, agingStatus, suggestion, suggestionIcon };
  });

  const filtered = enriched.filter((v) => {
    const matchSearch = `${v.brand} ${v.model} ${v.plate || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "days_desc": return b.days - a.days;
      case "days_asc": return a.days - b.days;
      case "profit_desc": return b.profit - a.profit;
      case "profit_asc": return a.profit - b.profit;
      case "risk": {
        const riskOrder = { red: 0, yellow: 1, green: 2 };
        return (riskOrder[a.agingStatus] || 2) - (riskOrder[b.agingStatus] || 2);
      }
      default: return 0;
    }
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const inStockVehicles = enriched.filter((v) => v.status === "em_estoque");
  const inStockCount = inStockVehicles.length;
  const totalInvested = inStockVehicles.reduce((s, v) => s + v.cost, 0);
  const totalProfitPotential = inStockVehicles.reduce((s, v) => s + v.profit, 0);
  const redCount = inStockVehicles.filter((v) => v.agingStatus === "red").length;

  const isDealership = businessType === "dealership";

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{labels.stockPage} & Lucro</h1>
          <p className="text-sm text-muted-foreground">{inStockCount} {labels.itemPlural.toLowerCase()} • {formatCurrency(totalInvested)} investido • Lucro potencial: {formatCurrency(totalProfitPotential)}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) resetForm(); else setDialogOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90"
              onClick={() => { setEditingId(null); setForm(emptyForm); setFormStep(1); }}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">{editingId ? labels.editItem : labels.addItem}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-colors ${formStep >= step ? "bg-primary" : "bg-secondary"}`} />
                  <p className={`text-[10px] mt-1 ${formStep >= step ? "text-primary" : "text-muted-foreground"}`}>
                    {step === 1 ? "Dados" : step === 2 ? "Custos" : "Lucro"}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">{labels.brand} *</label>
                      <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">{labels.model} *</label>
                      <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">{labels.yearFab}</label>
                      <Input type="number" value={form.year_fab || ""} onChange={(e) => setForm({ ...form, year_fab: +e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">{labels.yearModel}</label>
                      <Input type="number" value={form.year_model || ""} onChange={(e) => setForm({ ...form, year_model: +e.target.value })} /></div>
                  </div>

                  {/* Custom fields from template */}
                  {customFields.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {customFields.map((field) => (
                        <div key={field.key}>
                          <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                          {field.type === "select" && field.options ? (
                            <Select 
                              value={form.custom_fields[field.key] || ""} 
                              onValueChange={(v) => setForm({ ...form, custom_fields: { ...form.custom_fields, [field.key]: v } })}
                            >
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {field.options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              type={field.type === "number" ? "number" : "text"}
                              value={form.custom_fields[field.key] || ""}
                              onChange={(e) => setForm({ ...form, custom_fields: { ...form.custom_fields, [field.key]: field.type === "number" ? +e.target.value : e.target.value } })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button type="button" className="w-full" onClick={() => {
                    if (!form.brand || !form.model) { toast({ title: `Preencha ${labels.brand.toLowerCase()} e ${labels.model.toLowerCase()}`, variant: "destructive" }); return; }
                    setFormStep(2);
                  }}>Próximo →</Button>
                </>
              )}

              {formStep === 2 && (
                <>
                  <div className="space-y-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Preço de Compra (R$) *</label>
                      <Input type="number" value={form.purchase_price || ""} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })} required className="text-lg font-bold" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Custo de Recondicionamento (R$)</label>
                      <Input type="number" value={form.reconditioning_cost || ""} onChange={(e) => setForm({ ...form, reconditioning_cost: +e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Custo de Transporte (R$)</label>
                      <Input type="number" value={form.transport_cost || ""} onChange={(e) => setForm({ ...form, transport_cost: +e.target.value })} /></div>

                    <div className="rounded-xl bg-secondary/30 border border-border/50 p-3">
                      <p className="text-xs text-muted-foreground">Custo Total</p>
                      <p className="font-display text-lg font-bold">{formatCurrency(totalCost)}</p>
                    </div>

                    <div><label className="text-xs text-muted-foreground mb-1 block">Margem Desejada (%)</label>
                      <div className="flex items-center gap-3">
                        <Input type="number" value={form.desired_margin} onChange={(e) => setForm({ ...form, desired_margin: +e.target.value })} className="w-24" />
                        <div className="flex gap-1">
                          {[10, 15, 20, 25, 30].map((m) => (
                            <button key={m} type="button" className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${form.desired_margin === m ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                              onClick={() => setForm({ ...form, desired_margin: m })}>{m}%</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    {totalCost > 0 && (
                      <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
                        <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-primary" /><span className="text-xs font-semibold text-primary">Preço Sugerido</span></div>
                        <p className="font-display text-2xl font-bold text-primary">{formatCurrency(suggestedPrice)}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">Custo total: {formatCurrency(totalCost)} + {form.desired_margin}% margem</p>
                      </div>
                    )}
                    <div><label className="text-xs text-muted-foreground mb-1 block">Preço de Venda (R$)</label>
                      <Input type="number" value={form.listing_price || suggestedPrice || ""} onChange={(e) => setForm({ ...form, listing_price: +e.target.value })} className="text-lg font-bold" />
                      <p className="text-[10px] text-muted-foreground mt-1">Deixe em branco para usar o preço sugerido</p></div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setFormStep(1)} className="flex-1">← Voltar</Button>
                    <Button type="button" className="flex-1" onClick={() => setFormStep(3)}>Próximo →</Button>
                  </div>
                </>
              )}

              {formStep === 3 && (
                <>
                  <div className="rounded-xl bg-gradient-card border border-primary/20 p-5 shadow-glow-sm">
                    <h4 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" /> Resumo do Lucro Esperado
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Compra</span><span>{formatCurrency(form.purchase_price)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recondicionamento</span><span>{formatCurrency(form.reconditioning_cost)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Transporte</span><span>{formatCurrency(form.transport_cost)}</span></div>
                      <div className="flex justify-between text-sm font-medium border-t border-border/30 pt-2"><span>Custo total</span><span>{formatCurrency(totalCost)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço de venda</span><span className="font-semibold">{formatCurrency(form.listing_price || suggestedPrice)}</span></div>
                      <div className="flex justify-between items-center border-t border-border/30 pt-2">
                        <span className="font-semibold">Lucro esperado</span>
                        <span className={`font-display text-xl font-bold ${expectedProfit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(expectedProfit)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Margem de lucro</span>
                        <span>{(form.listing_price || suggestedPrice) > 0 ? ((expectedProfit / (form.listing_price || suggestedPrice)) * 100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                  </div>
                  <Input placeholder="Observações (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setFormStep(2)} className="flex-1">← Voltar</Button>
                    <Button type="submit" className="flex-1 bg-gradient-profit text-primary-foreground font-semibold shadow-glow" disabled={submitting}>
                      {submitting ? "Salvando..." : editingId ? "Atualizar" : `Salvar ${labels.itemSingular}`}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Em Estoque</span></div>
          <p className="font-display text-xl font-bold">{inStockCount}</p>
        </Card>
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Investido</span></div>
          <p className="font-display text-lg md:text-xl font-bold">{formatCurrency(totalInvested)}</p>
        </Card>
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card border-primary/20">
          <div className="flex items-center gap-2 mb-1"><TrendingUp className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Lucro Potencial</span></div>
          <p className={`font-display text-lg md:text-xl font-bold ${totalProfitPotential >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(totalProfitPotential)}</p>
        </Card>
        <Card className={`p-4 bg-gradient-card border-border/50 shadow-card ${redCount > 0 ? "border-destructive/20" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className={`w-4 h-4 ${redCount > 0 ? "text-destructive" : "text-muted-foreground"}`} /><span className="text-xs text-muted-foreground">Em Risco</span></div>
          <p className={`font-display text-xl font-bold ${redCount > 0 ? "text-destructive" : ""}`}>{redCount}</p>
        </Card>
      </div>

      {/* Filters & Sort */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-11 min-h-[44px]" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 md:w-40 h-11 min-h-[44px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="em_estoque">Em estoque</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40 md:w-48 h-11 min-h-[44px]"><SelectValue placeholder="Ordenar" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="days_desc">Mais tempo parado</SelectItem>
            <SelectItem value="days_asc">Mais recente</SelectItem>
            <SelectItem value="profit_desc">Maior lucro</SelectItem>
            <SelectItem value="profit_asc">Menor lucro</SelectItem>
            <SelectItem value="risk">Maior risco</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Item Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((v) => {
          const firstPhoto = v.photos && v.photos.length > 0 ? v.photos[0] : null;
          const SuggIcon = v.suggestionIcon === "up" ? ArrowUp : v.suggestionIcon === "down" ? ArrowDown : v.suggestionIcon === "promo" ? Megaphone : null;

          return (
            <Card key={v.id} className={`bg-gradient-card border hover:shadow-card-lg transition-all duration-300 shadow-card overflow-hidden cursor-pointer group ${
              v.agingStatus === "red" ? "border-destructive/20" : v.agingStatus === "yellow" ? "border-amber-500/20" : "border-border hover:border-primary/20"
            }`} onClick={() => navigate(`/estoque/${v.id}`)}>
              {firstPhoto && (
                <div className="aspect-video overflow-hidden">
                  <img src={firstPhoto} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold">{v.brand} {v.model}</h3>
                    <p className="text-xs text-muted-foreground">{v.year_fab}/{v.year_model}{isDealership && ` • ${v.plate || "Sem placa"}`}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      v.agingStatus === "red" ? "bg-destructive animate-pulse" : v.agingStatus === "yellow" ? "bg-amber-500" : "bg-primary"
                    }`} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="w-3.5 h-3.5" /><span>Custo: {formatCurrency(v.cost)}</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="w-3.5 h-3.5 text-primary" /><span>Venda: {formatCurrency(v.listing_price || 0)}</span></div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className={v.agingStatus === "red" ? "text-destructive font-semibold" : v.agingStatus === "yellow" ? "text-amber-500 font-semibold" : "text-muted-foreground"}>{v.days} dias</span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-muted-foreground">Lucro</span>
                    <p className={`text-sm font-display font-bold ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                      {v.profit >= 0 ? "+" : ""}{formatCurrency(v.profit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">Margem</span>
                    <p className={`text-sm font-display font-bold ${v.margin >= 20 ? "text-primary" : v.margin >= 10 ? "text-amber-500" : "text-destructive"}`}>
                      {v.margin.toFixed(0)}%
                    </p>
                  </div>
                </div>

                {v.suggestion && v.status === "em_estoque" && (
                  <div className={`mt-2 rounded-lg px-3 py-2 flex items-center gap-2 ${
                    v.suggestionIcon === "promo" || v.suggestionIcon === "down"
                      ? "bg-destructive/5 border border-destructive/10"
                      : "bg-primary/5 border border-primary/10"
                  }`}>
                    {SuggIcon && <SuggIcon className={`w-3.5 h-3.5 ${v.suggestionIcon === "up" ? "text-primary" : "text-destructive"}`} />}
                    <p className="text-[10px] font-medium">{v.suggestion}</p>
                  </div>
                )}

                {v.agingStatus === "red" && v.status === "em_estoque" && (
                  <div className="mt-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                    <p className="text-[10px] text-destructive font-medium">
                      ⚠️ {labels.itemCostDaily}
                    </p>
                  </div>
                )}

                {v.photos && v.photos.length > 1 && (
                  <div className="mt-3 flex gap-1 overflow-x-auto">
                    {v.photos.slice(1, 5).map((p, i) => (
                      <img key={i} src={p} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    ))}
                    {v.photos.length > 5 && <span className="text-[10px] text-muted-foreground self-center ml-1">+{v.photos.length - 5}</span>}
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {v.status === "em_estoque" && (
                    <Button size="sm" className="flex-1 text-xs h-11 min-h-[44px] bg-primary text-primary-foreground"
                      onClick={(e) => handleOpenSell(v, e)}>
                      <Tag className="w-3.5 h-3.5 mr-1" /> {labels.sellItem}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-11 min-h-[44px]" onClick={(e) => { e.stopPropagation(); openEdit(v); }}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                  </Button>
                  <label onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" className="text-xs h-11 min-h-[44px] w-11" type="button" disabled={uploadingPhotos}
                      onClick={() => document.getElementById(`photo-${v.id}`)?.click()}>
                      <Upload className="w-3.5 h-3.5" />
                    </Button>
                    <input id={`photo-${v.id}`} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => e.target.files && handlePhotoUpload(v.id, e.target.files)} />
                  </label>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-11 min-h-[44px] w-11 p-0 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border max-w-[90vw] sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {labels.itemSingular.toLowerCase()}?</AlertDialogTitle>
                        <AlertDialogDescription>{labels.deleteConfirm.replace("O veículo", `${v.brand} ${v.model}`)}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="h-11 min-h-[44px]">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-destructive text-destructive-foreground h-11 min-h-[44px]">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-16">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">{labels.noItems}</p>
          {vehicles.length === 0 && (
            <Button className="bg-primary text-primary-foreground font-semibold" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> {labels.addFirstItem}
            </Button>
          )}
        </div>
      )}

      {sellVehicle && (
        <SellVehicleDialog
          open={!!sellVehicle}
          onOpenChange={(open) => { if (!open) setSellVehicle(null); }}
          vehicle={sellVehicle}
        />
      )}
    </div>
  );
};

export default Estoque;
