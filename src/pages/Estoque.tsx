import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
import { Plus, Search, Car, Calendar, DollarSign, TrendingUp, Zap, AlertTriangle, Pencil, Trash2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

type Vehicle = {
  id: string; brand: string; model: string; year_fab: number; year_model: number;
  plate: string | null; color: string | null; mileage: number | null;
  fuel: string | null; transmission: string | null; purchase_price: number;
  reconditioning_cost: number | null; listing_price: number | null;
  suggested_price: number | null; status: "em_estoque" | "vendido" | "reservado";
  entry_date: string; notes: string | null; photos: string[] | null;
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
  purchase_price: 0, reconditioning_cost: 0, listing_price: 0, desired_margin: 20, notes: "",
};

const Estoque = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    setVehicles((data as Vehicle[]) || []);
    setLoading(false);
  };

  const totalCost = form.purchase_price + form.reconditioning_cost;
  const suggestedPrice = totalCost > 0 ? Math.round(totalCost * (1 + form.desired_margin / 100)) : 0;
  const expectedProfit = (form.listing_price || suggestedPrice) - totalCost;

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    const cost = v.purchase_price + (v.reconditioning_cost || 0);
    const margin = cost > 0 && v.listing_price ? Math.round(((v.listing_price - cost) / cost) * 100) : 20;
    setForm({
      brand: v.brand, model: v.model, year_fab: v.year_fab, year_model: v.year_model,
      plate: v.plate || "", color: v.color || "", mileage: v.mileage || 0,
      fuel: v.fuel || "flex", transmission: v.transmission || "manual",
      purchase_price: v.purchase_price, reconditioning_cost: v.reconditioning_cost || 0,
      listing_price: v.listing_price || 0, desired_margin: margin, notes: v.notes || "",
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
    const payload = {
      brand: form.brand, model: form.model, year_fab: form.year_fab, year_model: form.year_model,
      plate: form.plate || null, color: form.color || null, mileage: form.mileage,
      fuel: form.fuel, transmission: form.transmission, purchase_price: form.purchase_price,
      reconditioning_cost: form.reconditioning_cost,
      listing_price: form.listing_price || suggestedPrice, suggested_price: suggestedPrice,
      notes: form.notes || null,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("vehicles").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("vehicles").insert({ ...payload, created_by: user?.id }));
    }

    setSubmitting(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingId ? "Veículo atualizado! ✅" : "Veículo adicionado! 🚗" });
      resetForm();
      fetchVehicles();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Veículo excluído" });
      fetchVehicles();
    }
  };

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
      fetchVehicles();
    }
    setUploadingPhotos(false);
  };

  const handleRemovePhoto = async (vehicleId: string, photoUrl: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const updated = (vehicle?.photos || []).filter((p) => p !== photoUrl);
    await supabase.from("vehicles").update({ photos: updated }).eq("id", vehicleId);
    fetchVehicles();
  };

  const filtered = vehicles.filter((v) => {
    const matchSearch = `${v.brand} ${v.model} ${v.plate || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const inStockCount = vehicles.filter((v) => v.status === "em_estoque").length;
  const deadCount = vehicles.filter((v) => v.status === "em_estoque" && differenceInDays(new Date(), new Date(v.entry_date)) > 60).length;
  const totalInvested = vehicles.filter((v) => v.status === "em_estoque").reduce((s, v) => s + v.purchase_price + (v.reconditioning_cost || 0), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} veículos</p>
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
              <DialogTitle className="font-display">{editingId ? "Editar Veículo" : "Novo Veículo"}</DialogTitle>
            </DialogHeader>

            <div className="flex items-center gap-2 mb-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex-1">
                  <div className={`h-1.5 rounded-full transition-colors ${formStep >= step ? "bg-primary" : "bg-secondary"}`} />
                  <p className={`text-[10px] mt-1 ${formStep >= step ? "text-primary" : "text-muted-foreground"}`}>
                    {step === 1 ? "Dados" : step === 2 ? "Valores" : "Lucro"}
                  </p>
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formStep === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Marca *</label>
                      <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Modelo *</label>
                      <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Ano Fabricação</label>
                      <Input type="number" value={form.year_fab} onChange={(e) => setForm({ ...form, year_fab: +e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Ano Modelo</label>
                      <Input type="number" value={form.year_model} onChange={(e) => setForm({ ...form, year_model: +e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Placa</label>
                      <Input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Cor</label>
                      <Input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Quilometragem</label>
                      <Input type="number" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: +e.target.value })} /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Combustível</label>
                      <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="flex">Flex</SelectItem><SelectItem value="gasolina">Gasolina</SelectItem>
                          <SelectItem value="etanol">Etanol</SelectItem><SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="eletrico">Elétrico</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" className="w-full" onClick={() => {
                    if (!form.brand || !form.model) { toast({ title: "Preencha marca e modelo", variant: "destructive" }); return; }
                    setFormStep(2);
                  }}>Próximo →</Button>
                </>
              )}

              {formStep === 2 && (
                <>
                  <div className="space-y-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Preço de Compra (R$) *</label>
                      <Input type="number" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })} required className="text-lg font-bold" /></div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Custo de Recondicionamento (R$)</label>
                      <Input type="number" value={form.reconditioning_cost} onChange={(e) => setForm({ ...form, reconditioning_cost: +e.target.value })} /></div>
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
                      <Input type="number" value={form.listing_price || suggestedPrice} onChange={(e) => setForm({ ...form, listing_price: +e.target.value })} className="text-lg font-bold" />
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
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Custo de aquisição</span><span>{formatCurrency(form.purchase_price)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Recondicionamento</span><span>{formatCurrency(form.reconditioning_cost)}</span></div>
                      <div className="flex justify-between text-sm font-medium border-t border-border/30 pt-2"><span>Custo total</span><span>{formatCurrency(totalCost)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Preço de venda</span><span className="font-semibold">{formatCurrency(form.listing_price || suggestedPrice)}</span></div>
                      <div className="flex justify-between items-center border-t border-border/30 pt-2">
                        <span className="font-semibold">Lucro esperado</span>
                        <span className={`font-display text-xl font-bold ${expectedProfit >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(expectedProfit)}</span>
                      </div>
                    </div>
                  </div>
                  <Input placeholder="Observações (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setFormStep(2)} className="flex-1">← Voltar</Button>
                    <Button type="submit" className="flex-1 bg-gradient-profit text-primary-foreground font-semibold shadow-glow" disabled={submitting}>
                      {submitting ? "Salvando..." : editingId ? "Atualizar" : "Salvar Veículo"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-1"><Car className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Em Estoque</span></div>
          <p className="font-display text-xl font-bold">{inStockCount}</p>
        </Card>
        <Card className="p-4 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center gap-2 mb-1"><DollarSign className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Investido</span></div>
          <p className="font-display text-xl font-bold">{formatCurrency(totalInvested)}</p>
        </Card>
        <Card className={`p-4 bg-gradient-card border-border/50 shadow-card ${deadCount > 0 ? "border-destructive/20" : ""}`}>
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className={`w-4 h-4 ${deadCount > 0 ? "text-destructive" : "text-muted-foreground"}`} /><span className="text-xs text-muted-foreground">Parados (60d+)</span></div>
          <p className={`font-display text-xl font-bold ${deadCount > 0 ? "text-destructive" : ""}`}>{deadCount}</p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="em_estoque">Em estoque</SelectItem>
            <SelectItem value="reservado">Reservado</SelectItem>
            <SelectItem value="vendido">Vendido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Vehicle Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const days = differenceInDays(new Date(), new Date(v.entry_date));
          const margin = (v.listing_price || 0) - v.purchase_price - (v.reconditioning_cost || 0);
          const isDead = days > 60;
          const isSlow = days > 30;
          const firstPhoto = v.photos && v.photos.length > 0 ? v.photos[0] : null;

          return (
            <Card key={v.id} className={`bg-gradient-card border-border/50 hover:border-border transition-all shadow-card overflow-hidden ${
              isDead ? "border-destructive/20" : isSlow ? "border-accent/20" : ""
            }`}>
              {/* Photo */}
              {firstPhoto && (
                <div className="aspect-video overflow-hidden">
                  <img src={firstPhoto} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-display font-semibold">{v.brand} {v.model}</h3>
                    <p className="text-xs text-muted-foreground">{v.year_fab}/{v.year_model} • {v.plate || "Sem placa"}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
                    {isDead && <div className="neon-dot-red" title="Parado há 60+ dias" />}
                    {isSlow && !isDead && <div className="neon-dot-amber" title="Lento (30+ dias)" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="w-3.5 h-3.5" /><span>Compra: {formatCurrency(v.purchase_price)}</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><DollarSign className="w-3.5 h-3.5 text-primary" /><span>Venda: {formatCurrency(v.listing_price || 0)}</span></div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Car className="w-3.5 h-3.5" /><span>{(v.mileage || 0).toLocaleString("pt-BR")} km</span></div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className={isDead ? "text-destructive font-semibold" : isSlow ? "text-accent font-semibold" : "text-muted-foreground"}>{days} dias</span>
                  </div>
                </div>

                {v.listing_price && v.purchase_price ? (
                  <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Margem estimada</span>
                    <span className={`text-sm font-display font-bold ${margin >= 0 ? "text-primary" : "text-destructive"}`}>
                      {margin >= 0 ? "+" : ""}{formatCurrency(margin)}
                    </span>
                  </div>
                ) : null}

                {isDead && (
                  <div className="mt-2 rounded-lg bg-destructive/5 border border-destructive/10 px-3 py-2">
                    <p className="text-[10px] text-destructive font-medium">⚠️ Este carro está te fazendo perder dinheiro</p>
                  </div>
                )}

                {/* Photos section */}
                {v.photos && v.photos.length > 1 && (
                  <div className="mt-3 flex gap-1 overflow-x-auto">
                    {v.photos.slice(1, 5).map((p, i) => (
                      <img key={i} src={p} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    ))}
                    {v.photos.length > 5 && <span className="text-[10px] text-muted-foreground self-center ml-1">+{v.photos.length - 5}</span>}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-3 pt-3 border-t border-border/30 flex items-center gap-2">
                  <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => openEdit(v)}>
                    <Pencil className="w-3 h-3 mr-1" /> Editar
                  </Button>
                  <label className="flex-1">
                    <Button size="sm" variant="outline" className="w-full text-xs h-8" type="button" disabled={uploadingPhotos}
                      onClick={() => document.getElementById(`photo-${v.id}`)?.click()}>
                      <Upload className="w-3 h-3 mr-1" /> {uploadingPhotos ? "Enviando..." : "Fotos"}
                    </Button>
                    <input id={`photo-${v.id}`} type="file" accept="image/*" multiple className="hidden"
                      onChange={(e) => e.target.files && handlePhotoUpload(v.id, e.target.files)} />
                  </label>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card border-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir veículo?</AlertDialogTitle>
                        <AlertDialogDescription>Esta ação não pode ser desfeita. O veículo {v.brand} {v.model} será removido permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(v.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Nenhum veículo encontrado</p>
          {vehicles.length === 0 && (
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar seu primeiro veículo
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default Estoque;
