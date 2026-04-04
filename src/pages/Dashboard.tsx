import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Car, DollarSign, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { differenceInDays, format } from "date-fns";

type Stats = {
  totalVehicles: number;
  inStock: number;
  totalLeads: number;
  newLeads: number;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  agingVehicles: { id: string; brand: string; model: string; days: number; listing_price: number }[];
};

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    totalVehicles: 0, inStock: 0, totalLeads: 0, newLeads: 0,
    totalSales: 0, totalRevenue: 0, totalProfit: 0, agingVehicles: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [vehiclesRes, leadsRes, salesRes, expensesRes] = await Promise.all([
      supabase.from("vehicles").select("*"),
      supabase.from("leads").select("*"),
      supabase.from("sales").select("*, vehicles(purchase_price, reconditioning_cost)"),
      supabase.from("vehicle_expenses").select("vehicle_id, amount"),
    ]);

    const vehicles = vehiclesRes.data || [];
    const leads = leadsRes.data || [];
    const sales = salesRes.data || [];
    const expenses = expensesRes.data || [];

    const inStock = vehicles.filter((v) => v.status === "em_estoque");
    const newLeads = leads.filter((l) => l.status === "novo");
    const totalRevenue = sales.reduce((sum, s) => sum + (s.final_price || 0), 0);

    // Calculate profit: sale price - purchase - reconditioning - expenses
    const expensesByVehicle: Record<string, number> = {};
    expenses.forEach((e) => {
      expensesByVehicle[e.vehicle_id] = (expensesByVehicle[e.vehicle_id] || 0) + (e.amount || 0);
    });

    const totalProfit = sales.reduce((sum, s) => {
      const v = s.vehicles as any;
      const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0) + (expensesByVehicle[s.vehicle_id] || 0);
      return sum + (s.final_price || 0) - cost - (s.commission || 0);
    }, 0);

    // Aging vehicles (> 30 days in stock)
    const agingVehicles = inStock
      .map((v) => ({
        id: v.id,
        brand: v.brand,
        model: v.model,
        days: differenceInDays(new Date(), new Date(v.entry_date)),
        listing_price: v.listing_price || 0,
      }))
      .filter((v) => v.days > 30)
      .sort((a, b) => b.days - a.days);

    setStats({
      totalVehicles: vehicles.length,
      inStock: inStock.length,
      totalLeads: leads.length,
      newLeads: newLeads.length,
      totalSales: sales.length,
      totalRevenue,
      totalProfit,
      agingVehicles,
    });
    setLoading(false);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const kpiCards = [
    { label: "Em estoque", value: stats.inStock, icon: Car, color: "text-primary" },
    { label: "Leads novos", value: stats.newLeads, icon: Users, color: "text-accent" },
    { label: "Vendas", value: stats.totalSales, icon: BarChart3, color: "text-primary" },
    { label: "Faturamento", value: formatCurrency(stats.totalRevenue), icon: DollarSign, color: "text-primary" },
    { label: "Lucro líquido", value: formatCurrency(stats.totalProfit), icon: TrendingUp, color: "text-primary" },
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da sua loja</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="p-4 bg-card border-border">
            <div className="flex items-center gap-2 mb-2">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-xs text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="font-display text-xl font-bold">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Aging Vehicles Alert */}
      {stats.agingVehicles.length > 0 && (
        <Card className="p-5 border-accent/30 bg-accent/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-accent" />
            <h2 className="font-display text-lg font-semibold">Veículos parados ({stats.agingVehicles.length})</h2>
          </div>
          <div className="space-y-2">
            {stats.agingVehicles.slice(0, 5).map((v) => (
              <div key={v.id} className="flex items-center justify-between text-sm">
                <span>{v.brand} {v.model}</span>
                <div className="flex items-center gap-4">
                  <span className="text-muted-foreground">{formatCurrency(v.listing_price)}</span>
                  <span className={`font-semibold ${v.days > 60 ? "text-destructive" : "text-accent"}`}>
                    {v.days} dias
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
