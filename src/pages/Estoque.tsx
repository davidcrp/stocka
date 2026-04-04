import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, Car, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { differenceInDays } from "date-fns";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year_fab: number;
  year_model: number;
  plate: string | null;
  color: string | null;
  mileage: number | null;
  fuel: string | null;
  transmission: string | null;
  purchase_price: number;
  reconditioning_cost: number | null;
  listing_price: number | null;
  status: "em_estoque" | "vendido" | "reservado";
  entry_date: string;
  notes: string | null;
};

const statusColors: Record<string, string> = {
  em_estoque: "bg-primary/10 text-primary",
  vendido: "bg-muted text-muted-foreground",
  reservado: "bg-accent/10 text-accent",
};

const statusLabels: Record<string, string> = {
  em_estoque: "Em estoque",
  vendido: "Vendido",
  reservado: "Reservado",
};

const Estoque = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [form, setForm] = useState({
    brand: "", model: "", year_fab: new Date().getFullYear(), year_model: new Date().getFullYear(),
    plate: "", color: "", mileage: 0, fuel: "flex", transmission: "manual",
    purchase_price: 0, reconditioning_cost: 0, listing_price: 0, notes: "",
  });

  useEffect(() => { fetchVehicles(); }, []);

  const fetchVehicles = async () => {
    const { data } = await supabase.from("vehicles").select("*").order("created_at", { ascending: false });
    setVehicles((data as Vehicle[]) || []);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("vehicles").insert({
      ...form,
      created_by: user?.id,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Veículo adicionado!" });
      setDialogOpen(false);
      setForm({ brand: "", model: "", year_fab: new Date().getFullYear(), year_model: new Date().getFullYear(), plate: "", color: "", mileage: 0, fuel: "flex", transmission: "manual", purchase_price: 0, reconditioning_cost: 0, listing_price: 0, notes: "" });
      fetchVehicles();
    }
  };

  const filtered = vehicles.filter((v) => {
    const matchSearch = `${v.brand} ${v.model} ${v.plate || ""}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Estoque</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} veículos</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Novo veículo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Marca *" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required />
                <Input placeholder="Modelo *" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} required />
                <Input type="number" placeholder="Ano fab" value={form.year_fab} onChange={(e) => setForm({ ...form, year_fab: +e.target.value })} />
                <Input type="number" placeholder="Ano modelo" value={form.year_model} onChange={(e) => setForm({ ...form, year_model: +e.target.value })} />
                <Input placeholder="Placa" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} />
                <Input placeholder="Cor" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
                <Input type="number" placeholder="KM" value={form.mileage} onChange={(e) => setForm({ ...form, mileage: +e.target.value })} />
                <Select value={form.fuel} onValueChange={(v) => setForm({ ...form, fuel: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flex">Flex</SelectItem>
                    <SelectItem value="gasolina">Gasolina</SelectItem>
                    <SelectItem value="etanol">Etanol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="eletrico">Elétrico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input type="number" placeholder="Preço compra *" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: +e.target.value })} required />
                <Input type="number" placeholder="Recondicionamento" value={form.reconditioning_cost} onChange={(e) => setForm({ ...form, reconditioning_cost: +e.target.value })} />
                <Input type="number" placeholder="Preço de venda" value={form.listing_price} onChange={(e) => setForm({ ...form, listing_price: +e.target.value })} />
              </div>
              <Input placeholder="Observações" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button type="submit" className="w-full bg-gradient-profit text-primary-foreground font-semibold">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
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

      {/* Vehicle cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((v) => {
          const days = differenceInDays(new Date(), new Date(v.entry_date));
          return (
            <Card key={v.id} className="p-4 bg-card border-border hover:border-primary/20 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-display font-semibold">{v.brand} {v.model}</h3>
                  <p className="text-xs text-muted-foreground">{v.year_fab}/{v.year_model} • {v.plate || "Sem placa"}</p>
                </div>
                <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Compra: {formatCurrency(v.purchase_price)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <DollarSign className="w-3.5 h-3.5 text-primary" />
                  <span>Venda: {formatCurrency(v.listing_price || 0)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Car className="w-3.5 h-3.5" />
                  <span>{(v.mileage || 0).toLocaleString("pt-BR")} km</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className={days > 60 ? "text-destructive font-semibold" : days > 30 ? "text-accent font-semibold" : "text-muted-foreground"}>
                    {days} dias
                  </span>
                </div>
              </div>
              {v.listing_price && v.purchase_price ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">Margem estimada: </span>
                  <span className="text-sm font-semibold text-primary">
                    {formatCurrency((v.listing_price || 0) - v.purchase_price - (v.reconditioning_cost || 0))}
                  </span>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Car className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum veículo encontrado</p>
        </div>
      )}
    </div>
  );
};

export default Estoque;
