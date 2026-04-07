import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft, Calendar, Package, DollarSign, TrendingUp, Clock, Upload, CheckCircle2, Info, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import SellVehicleDialog from "@/components/SellVehicleDialog";

const VehicleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { labels, customFields } = useBusiness();
  const [selectedImg, setSelectedImg] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [sellOpen, setSellOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: vehicle, isLoading, refetch } = useQuery({
    queryKey: ["vehicle-detail", id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["vehicle-expenses", id],
    queryFn: async () => {
      const { data } = await supabase.from("vehicle_expenses").select("*").eq("vehicle_id", id!).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const handlePhotoUpload = async (files: FileList) => {
    if (!id) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("vehicle-photos").upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
        newUrls.push(data.publicUrl);
      }
    }
    if (newUrls.length > 0) {
      const existing = vehicle?.photos || [];
      await supabase.from("vehicles").update({ photos: [...existing, ...newUrls] }).eq("id", id);
      toast({ title: `${newUrls.length} foto(s) enviada(s)! 📸` });
      refetch();
    }
    setUploading(false);
  };

  const getStoragePathFromPublicUrl = (photoUrl: string) => {
    try {
      const marker = "/storage/v1/object/public/vehicle-photos/";
      const pathname = new URL(photoUrl).pathname;
      const path = pathname.includes(marker) ? pathname.split(marker)[1] : "";
      return path ? decodeURIComponent(path) : null;
    } catch {
      return null;
    }
  };

  const handleDeletePhoto = async () => {
    const photoUrl = photos[selectedImg];

    if (!id || !photoUrl) return;

    setDeletingPhoto(photoUrl);

    const nextPhotos = photos.filter((_, index) => index !== selectedImg);
    const { error: updateError } = await supabase.from("vehicles").update({ photos: nextPhotos }).eq("id", id);

    if (updateError) {
      toast({ title: "Erro ao excluir foto", description: updateError.message, variant: "destructive" });
      setDeletingPhoto(null);
      return;
    }

    const storagePath = getStoragePathFromPublicUrl(photoUrl);
    if (storagePath) {
      const { error: storageError } = await supabase.storage.from("vehicle-photos").remove([storagePath]);
      if (storageError) {
        console.warn("Não foi possível remover o arquivo do armazenamento:", storageError.message);
      }
    }

    setSelectedImg((current) => (nextPhotos.length === 0 ? 0 : Math.min(current, nextPhotos.length - 1)));
    toast({ title: "Foto excluída com sucesso" });
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-detail", id] });
    refetch();
    setDeletingPhoto(null);
  };

  const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  if (isLoading || !vehicle) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const totalCost = (vehicle.purchase_price || 0) + (vehicle.reconditioning_cost || 0) + (vehicle.transport_cost || 0)
    + expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const listingPrice = vehicle.listing_price || 0;
  const profit = listingPrice - totalCost;
  const margin = listingPrice > 0 ? (profit / listingPrice) * 100 : 0;
  const days = differenceInDays(new Date(), new Date(vehicle.entry_date));
  const agingStatus = days < 15 ? "green" : days < 30 ? "yellow" : "red";
  const photos = vehicle.photos || [];
  const cf = (vehicle as any).custom_fields || {};

  return (
    <div className="space-y-6 max-w-5xl pb-8">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/estoque")} className="text-muted-foreground h-11 min-h-[44px]">
          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
        </Button>
        {vehicle.status === "em_estoque" && (
          <Button className="bg-primary text-primary-foreground gap-1.5 h-11 min-h-[44px] px-5" onClick={() => setSellOpen(true)}>
            <CheckCircle2 className="w-4 h-4" /> Marcar como Vendido
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Image Gallery */}
        <div className="space-y-3">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-muted border border-border relative">
            {photos.length > 0 ? (
              <>
                <img src={photos[selectedImg] || photos[0]} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="absolute right-3 top-3 h-10 w-10 rounded-full border border-border/60 bg-background/85 p-0 backdrop-blur-sm"
                      disabled={deletingPhoto === photos[selectedImg]}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-border">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A foto selecionada será removida deste item.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeletePhoto}
                        className="bg-destructive text-destructive-foreground"
                      >
                        {deletingPhoto === photos[selectedImg] ? "Excluindo..." : "Excluir foto"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                <Package className="w-16 h-16 mb-3 opacity-30" />
                <p className="text-sm">Sem fotos</p>
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x -mx-1 px-1">
              {photos.map((p: string, i: number) => (
                <button key={i} onClick={() => setSelectedImg(i)}
                  className={`w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all snap-start active:scale-95 ${selectedImg === i ? "border-primary shadow-glow-sm" : "border-border opacity-60 hover:opacity-100"}`}>
                  <img src={p} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <label>
            <Button variant="outline" className="w-full h-11 min-h-[44px]" disabled={uploading}
              onClick={() => document.getElementById("detail-photo-upload")?.click()}>
              <Upload className="w-4 h-4 mr-2" /> {uploading ? "Enviando..." : "Adicionar Fotos"}
            </Button>
            <input id="detail-photo-upload" type="file" accept="image/*" multiple className="hidden"
              onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)} />
          </label>
        </div>

        {/* Item Info */}
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="font-display text-2xl font-bold">{vehicle.brand} {vehicle.model}</h1>
              <Badge className={agingStatus === "red" ? "bg-destructive/10 text-destructive" : agingStatus === "yellow" ? "bg-amber-500/10 text-amber-500" : "bg-primary/10 text-primary"}>
                {days} dias
              </Badge>
            </div>
            <p className="text-muted-foreground">{vehicle.year_fab}/{vehicle.year_model}</p>
          </div>

          {/* Custom fields display */}
          {customFields.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {customFields.map((field) => {
                const value = cf[field.key];
                if (!value && value !== 0) return null;
                return (
                  <div key={field.key} className="flex items-center gap-2.5 p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <Info className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">{field.label}</p>
                      <p className="text-sm font-medium capitalize">{String(value)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cost Breakdown */}
          <Card className="p-5 border-border">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Análise de Custo
            </h3>
            <div className="space-y-2">
              <CostRow label="Compra" value={fmt(vehicle.purchase_price)} />
              <CostRow label="Recondicionamento" value={fmt(vehicle.reconditioning_cost || 0)} />
              <CostRow label="Transporte" value={fmt(vehicle.transport_cost || 0)} />
              {expenses.length > 0 && (
                <CostRow label={`Despesas extras (${expenses.length})`} value={fmt(expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0))} />
              )}
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Custo Total</span><span>{fmt(totalCost)}</span>
              </div>
            </div>
          </Card>

          {/* Profit Analysis */}
          <Card className={`p-5 border ${profit >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" /> Análise de Lucro
            </h3>
            <div className="space-y-2">
              <CostRow label="Preço de venda" value={fmt(listingPrice)} />
              <CostRow label="Custo total" value={`- ${fmt(totalCost)}`} />
              <div className="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Lucro</span>
                <span className={profit >= 0 ? "text-primary" : "text-destructive"}>{profit >= 0 ? "+" : ""}{fmt(profit)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Margem</span>
                <span className={margin >= 20 ? "text-primary font-semibold" : margin >= 10 ? "text-amber-500" : "text-destructive"}>
                  {margin.toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>

          {/* Timeline */}
          <Card className="p-5 border-border">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Linha do Tempo
            </h3>
            <div className="space-y-3">
              <TimelineItem date={vehicle.entry_date} label="Entrada no estoque" />
              {vehicle.sale_date && <TimelineItem date={vehicle.sale_date} label="Vendido" />}
              <TimelineItem date={new Date().toISOString()} label={`${days} dias em estoque`} active />
            </div>
          </Card>

          {vehicle.notes && (
            <Card className="p-5 border-border">
              <h3 className="font-display text-sm font-semibold mb-2">Observações</h3>
              <p className="text-sm text-muted-foreground">{vehicle.notes}</p>
            </Card>
          )}
        </div>
      </div>

      <SellVehicleDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        vehicle={vehicle}
        extraCosts={expenses.reduce((s: number, e: any) => s + (e.amount || 0), 0)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

const CostRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span>{value}</span>
  </div>
);

const TimelineItem = ({ date, label, active }: { date: string; label: string; active?: boolean }) => (
  <div className="flex items-center gap-3">
    <div className={`w-2.5 h-2.5 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/30"}`} />
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{format(new Date(date), "dd MMM yyyy", { locale: ptBR })}</p>
    </div>
  </div>
);

export default VehicleDetail;
