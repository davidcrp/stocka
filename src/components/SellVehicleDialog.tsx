import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBusiness } from "@/contexts/BusinessContext";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { DollarSign, Calendar, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type SellVehicleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    year_fab: number;
    purchase_price: number;
    reconditioning_cost?: number | null;
    transport_cost?: number | null;
    listing_price?: number | null;
  };
  extraCosts?: number;
  onSuccess?: () => void;
};

const SellVehicleDialog = ({ open, onOpenChange, vehicle, extraCosts = 0, onSuccess }: SellVehicleDialogProps) => {
  const { user, profile } = useAuth();
  const { labels } = useBusiness();
  const queryClient = useQueryClient();
  const defaultPrice = vehicle.listing_price || vehicle.purchase_price || 0;
  const [salePrice, setSalePrice] = useState(defaultPrice);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const totalCost = (vehicle.purchase_price || 0) + (vehicle.reconditioning_cost || 0) + (vehicle.transport_cost || 0) + extraCosts;
  const profit = salePrice - totalCost;

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  const handleSell = async () => {
    if (salePrice <= 0) {
      toast.error("Informe o preço de venda");
      return;
    }
    setSubmitting(true);

    const { error: saleError } = await supabase.from("sales").insert({
      vehicle_id: vehicle.id,
      seller_id: user?.id || null,
      final_price: salePrice,
      commission: 0,
      payment_method: "dinheiro",
      sale_date: saleDate,
      account_id: profile?.account_id,
    });

    if (saleError) {
      toast.error(saleError.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("vehicles").update({
      status: "vendido" as const,
      sale_date: saleDate,
      final_sale_price: salePrice,
    }).eq("id", vehicle.id);

    toast.success(`${vehicle.brand} ${vehicle.model} vendido! 🎉`);
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    queryClient.invalidateQueries({ queryKey: ["vehicle-detail"] });
    setSubmitting(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" /> Registrar Venda
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          <div className="rounded-xl bg-secondary/30 border border-border/50 p-4">
            <p className="font-semibold text-sm">{vehicle.brand} {vehicle.model} <span className="text-muted-foreground font-normal">{vehicle.year_fab}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Custo total: {fmt(totalCost)}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-primary" /> Preço de venda (R$)
            </label>
            <Input
              type="number"
              value={salePrice}
              onChange={(e) => setSalePrice(+e.target.value)}
              className="text-lg font-bold"
              min={0}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-muted-foreground" /> Data da venda
            </label>
            <Input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
            />
          </div>

          <div className={`rounded-xl p-4 border ${profit >= 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Lucro da venda</span>
              <span className={`font-display text-xl font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                {profit >= 0 ? "+" : ""}{fmt(profit)}
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground font-semibold h-11"
            onClick={handleSell}
            disabled={submitting}
          >
            {submitting ? "Registrando..." : "Confirmar Venda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SellVehicleDialog;
