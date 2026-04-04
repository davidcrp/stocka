import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";

type Sale = {
  id: string;
  final_price: number;
  commission: number | null;
  payment_method: string | null;
  sale_date: string;
  notes: string | null;
  vehicles: { brand: string; model: string; year_fab: number; purchase_price: number; reconditioning_cost: number | null } | null;
  leads: { name: string } | null;
  profiles: { full_name: string | null } | null;
};

const Vendas = () => {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    const { data } = await supabase
      .from("sales")
      .select("*, vehicles(brand, model, year_fab, purchase_price, reconditioning_cost), leads(name)")
      .order("sale_date", { ascending: false });
    setSales((data as any[]) || []);
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const totalRevenue = sales.reduce((s, sale) => s + (sale.final_price || 0), 0);
  const totalProfit = sales.reduce((s, sale) => {
    const v = sale.vehicles;
    const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0);
    return s + (sale.final_price || 0) - cost - (sale.commission || 0);
  }, 0);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Vendas</h1>
        <p className="text-sm text-muted-foreground">{sales.length} vendas realizadas</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Faturamento total</span>
          </div>
          <p className="font-display text-xl font-bold">{formatCurrency(totalRevenue)}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Lucro total</span>
          </div>
          <p className="font-display text-xl font-bold text-gradient-profit">{formatCurrency(totalProfit)}</p>
        </Card>
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Ticket médio</span>
          </div>
          <p className="font-display text-xl font-bold">{formatCurrency(sales.length ? totalRevenue / sales.length : 0)}</p>
        </Card>
      </div>

      <div className="space-y-3">
        {sales.map((sale) => {
          const v = sale.vehicles;
          const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0);
          const profit = (sale.final_price || 0) - cost - (sale.commission || 0);
          return (
            <Card key={sale.id} className="p-4 bg-card border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{v?.brand} {v?.model} {v?.year_fab}</h3>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    {sale.leads?.name && <span>Cliente: {sale.leads.name}</span>}
                    <span>{new Date(sale.sale_date).toLocaleDateString("pt-BR")}</span>
                    {sale.payment_method && <Badge variant="outline" className="text-xs">{sale.payment_method}</Badge>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display font-bold">{formatCurrency(sale.final_price)}</p>
                  <p className={`text-sm font-semibold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                    Lucro: {formatCurrency(profit)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {sales.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma venda registrada</p>
        </div>
      )}
    </div>
  );
};

export default Vendas;
