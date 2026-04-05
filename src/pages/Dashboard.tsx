import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Car, DollarSign, BarChart3,
  ArrowUpRight, Clock, Zap, Tag, ChevronRight, Flame, ShieldAlert,
  Wallet, Timer, Target, ArrowLeftRight, CheckCircle2,
  Image as ImageIcon, AlertTriangle, Minus, BadgeDollarSign,
  Activity, CircleDollarSign, Gauge,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

type VehicleAging = {
  id: string; brand: string; model: string; year_fab: number;
  days: number; listing_price: number; total_cost: number;
  profit: number; margin: number; status: "green" | "yellow" | "red";
  suggestion: string; photos: string[] | null;
  vehicleStatus: string;
  purchase_price: number;
};

type Stats = {
  inStock: number;
  totalInvested: number;
  totalInventoryValue: number;
  totalProfitPotential: number;
  avgDaysToSell: number;
  totalSales: number;
  totalProfit: number;
  thisMonthProfit: number;
  thisMonthSales: number;
  prevMonthProfit: number;
  prevMonthSales: number;
  chartData: { month: string; revenue: number; profit: number }[];
  vehicles: VehicleAging[];
  greenCount: number;
  yellowCount: number;
  redCount: number;
  tradesCount: number;
  tradesProfit: number;
  avgMargin: number;
  profitPerCar: number;
  capitalAtRisk: number;
  highDemandCount: number;
};

const fetchDashboardStats = async (): Promise<Stats> => {
  const [vehiclesRes, salesRes, expensesRes, tradesRes] = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("sales").select("*, vehicles(purchase_price, reconditioning_cost, transport_cost)"),
    supabase.from("vehicle_expenses").select("vehicle_id, amount"),
    supabase.from("trades").select("profit"),
  ]);

  const vehicles = vehiclesRes.data || [];
  const sales = salesRes.data || [];
  const expenses = expensesRes.data || [];
  const trades = tradesRes.data || [];

  const expensesByVehicle: Record<string, number> = {};
  expenses.forEach((e) => {
    expensesByVehicle[e.vehicle_id] = (expensesByVehicle[e.vehicle_id] || 0) + (e.amount || 0);
  });

  const inStock = vehicles.filter((v) => v.status === "em_estoque");

  const calcTotalCost = (v: any) =>
    (v.purchase_price || 0) + (v.reconditioning_cost || 0) + (v.transport_cost || 0) + (expensesByVehicle[v.id] || 0);

  const calcProfit = (sale: any) => {
    const v = sale.vehicles as any;
    const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0) + (v?.transport_cost || 0) + (expensesByVehicle[sale.vehicle_id] || 0);
    return (sale.final_price || 0) - cost - (sale.commission || 0);
  };

  const totalInvested = inStock.reduce((s, v) => s + calcTotalCost(v), 0);
  const totalInventoryValue = inStock.reduce((s, v) => s + (v.listing_price || 0), 0);
  const totalProfitPotential = totalInventoryValue - totalInvested;
  const totalProfit = sales.reduce((s, sale) => s + calcProfit(sale), 0);

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));

  const thisMonthSalesArr = sales.filter((s) => new Date(s.sale_date) >= thisMonthStart);
  const prevMonthSalesArr = sales.filter((s) => {
    const d = new Date(s.sale_date);
    return d >= prevMonthStart && d < thisMonthStart;
  });

  const thisMonthProfit = thisMonthSalesArr.reduce((s, sale) => s + calcProfit(sale), 0);
  const prevMonthProfit = prevMonthSalesArr.reduce((s, sale) => s + calcProfit(sale), 0);

  const chartData: { month: string; revenue: number; profit: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = startOfMonth(subMonths(now, i - 1));
    const monthSales = sales.filter((s) => {
      const d = new Date(s.sale_date);
      return d >= monthStart && d < monthEnd;
    });
    chartData.push({
      month: format(monthStart, "MMM", { locale: ptBR }),
      revenue: monthSales.reduce((s, sale) => s + (sale.final_price || 0), 0),
      profit: monthSales.reduce((s, sale) => s + calcProfit(sale), 0),
    });
  }

  const soldVehicles = vehicles.filter((v) => v.status === "vendido" && v.entry_date && v.sale_date);
  const avgDays = soldVehicles.length > 0
    ? soldVehicles.reduce((s, v) => s + differenceInDays(new Date(v.sale_date!), new Date(v.entry_date)), 0) / soldVehicles.length
    : 0;

  const agingVehicles: VehicleAging[] = inStock.map((v) => {
    const days = differenceInDays(new Date(), new Date(v.entry_date));
    const totalCost = calcTotalCost(v);
    const listingPrice = v.listing_price || 0;
    const profit = listingPrice - totalCost;
    const margin = listingPrice > 0 ? (profit / listingPrice) * 100 : 0;
    const status: "green" | "yellow" | "red" = days < 15 ? "green" : days < 30 ? "yellow" : "red";

    let suggestion = "Manter preço atual";
    if (days >= 30 && margin > 15) suggestion = "Reduza o preço em 10-15%";
    else if (days >= 30 && margin <= 15) suggestion = "Promova urgentemente";
    else if (days >= 15 && days < 30 && margin > 25) suggestion = "Considere reduzir preço";
    else if (days < 15 && margin > 20) suggestion = "Margem saudável — pode aumentar";

    return {
      id: v.id, brand: v.brand, model: v.model, year_fab: v.year_fab,
      days, listing_price: listingPrice, total_cost: totalCost,
      profit, margin, status, suggestion, photos: v.photos,
      vehicleStatus: v.status || "em_estoque",
      purchase_price: v.purchase_price || 0,
    };
  }).sort((a, b) => b.days - a.days);

  const tradesCount = trades.length;
  const tradesProfit = trades.reduce((s: number, t: any) => s + (t.profit || 0), 0);
  const avgMargin = agingVehicles.length > 0
    ? agingVehicles.reduce((s, v) => s + v.margin, 0) / agingVehicles.length : 0;
  const profitPerCar = sales.length > 0 ? totalProfit / sales.length : 0;

  const capitalAtRisk = agingVehicles
    .filter((v) => v.status === "red")
    .reduce((s, v) => s + v.total_cost, 0);

  const highDemandCount = agingVehicles.filter((v) => v.status === "green" && v.margin >= 20).length;

  return {
    inStock: inStock.length,
    totalInvested,
    totalInventoryValue,
    totalProfitPotential,
    avgDaysToSell: Math.round(avgDays),
    totalSales: sales.length,
    totalProfit,
    thisMonthProfit,
    thisMonthSales: thisMonthSalesArr.length,
    prevMonthProfit,
    prevMonthSales: prevMonthSalesArr.length,
    chartData,
    vehicles: agingVehicles,
    greenCount: agingVehicles.filter((v) => v.status === "green").length,
    yellowCount: agingVehicles.filter((v) => v.status === "yellow").length,
    redCount: agingVehicles.filter((v) => v.status === "red").length,
    tradesCount,
    tradesProfit,
    avgMargin,
    profitPerCar,
    capitalAtRisk,
    highDemandCount,
  };
};

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 15_000,
  });

  const markSoldMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ status: "vendido" as const, sale_date: new Date().toISOString().split("T")[0] })
        .eq("id", vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Veículo marcado como vendido" });
    },
  });

  const reducePriceMutation = useMutation({
    mutationFn: async ({ id, newPrice }: { id: string; newPrice: number }) => {
      const { error } = await supabase
        .from("vehicles")
        .update({ listing_price: newPrice })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast({ title: "Preço reduzido com sucesso" });
    },
  });

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  const fmtK = (v: number) => {
    if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
    return fmt(v);
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const redVehicles = stats.vehicles.filter((v) => v.status === "red");
  const yellowVehicles = stats.vehicles.filter((v) => v.status === "yellow");
  const greenVehicles = stats.vehicles.filter((v) => v.status === "green");

  const profitChangeNum = stats.prevMonthProfit > 0
    ? ((stats.thisMonthProfit - stats.prevMonthProfit) / stats.prevMonthProfit * 100)
    : stats.thisMonthProfit > 0 ? 100 : 0;
  const profitPositive = profitChangeNum >= 0;

  const handleReducePrice = (v: VehicleAging) => {
    const reduction = Math.round(v.listing_price * 0.1);
    const newPrice = v.listing_price - reduction;
    reducePriceMutation.mutate({ id: v.id, newPrice });
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* ───── CRITICAL ALERTS ───── */}
      {redVehicles.length > 0 && (
        <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 lg:p-5 cursor-pointer hover:bg-destructive/8 transition-all duration-300 group"
          onClick={() => navigate("/estoque")}
        >
          <div className="flex items-start lg:items-center gap-3 lg:gap-4">
            <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-destructive/15 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <ShieldAlert className="w-5 h-5 lg:w-6 lg:h-6 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm lg:text-base font-bold text-destructive">
                ⚠️ {redVehicles.length} veículo{redVehicles.length > 1 ? "s" : ""} parado{redVehicles.length > 1 ? "s" : ""} há +30 dias
              </p>
              <p className="text-xs lg:text-sm text-destructive/70 mt-0.5">
                {fmt(stats.capitalAtRisk)} em risco
              </p>
            </div>
            <Button size="sm" variant="destructive" className="shrink-0 font-bold hidden sm:flex">
              Resolver <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ───── HEADER ───── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-extrabold tracking-tight">Centro de Controle</h1>
          <p className="text-xs lg:text-sm text-muted-foreground mt-1">Decisões baseadas em dados</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/estoque")}>
            <Car className="w-4 h-4 mr-1.5" /> Estoque
          </Button>
          <Button size="sm" onClick={() => navigate("/vendas")} className="bg-primary text-primary-foreground">
            <DollarSign className="w-4 h-4 mr-1.5" /> Nova Venda
          </Button>
        </div>
      </div>

      {/* ───── HERO PROFIT + SECONDARY KPIs ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Hero Profit Card - dominant */}
        <Card className="lg:col-span-5 p-7 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent border-primary/25 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                <CircleDollarSign className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-bold text-primary uppercase tracking-widest">Lucro Mensal</span>
            </div>
            <p className="font-display text-5xl font-black tracking-tighter mt-3">
              {fmt(stats.thisMonthProfit)}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className={`flex items-center gap-1 text-sm font-bold px-3 py-1 rounded-full ${
                profitPositive ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              }`}>
                {profitPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {profitChangeNum >= 0 ? "+" : ""}{profitChangeNum.toFixed(1)}%
              </div>
              <span className="text-sm text-muted-foreground">vs mês anterior</span>
            </div>
            <div className="mt-6 pt-5 border-t border-primary/15 grid grid-cols-3 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Vendas</p>
                <p className="font-display text-2xl font-black mt-1">{stats.thisMonthSales}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Lucro/Carro</p>
                <p className="font-display text-2xl font-black text-primary mt-1">{fmtK(stats.profitPerCar)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Trocas</p>
                <p className="font-display text-2xl font-black mt-1">{stats.tradesCount}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Grid - 4 cards */}
        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          <KPICard
            icon={Wallet} label="Capital Investido" value={fmtK(stats.totalInvested)}
            sublabel={`${stats.inStock} veículo${stats.inStock !== 1 ? "s" : ""} em estoque`}
            detail={`Custo médio: ${stats.inStock > 0 ? fmtK(stats.totalInvested / stats.inStock) : "—"}`}
          />
          <KPICard
            icon={Target} label="Lucro Potencial" value={fmtK(stats.totalProfitPotential)}
            sublabel={`Estoque vale ${fmtK(stats.totalInventoryValue)}`}
            highlight={stats.totalProfitPotential > 0}
            detail={`Margem média: ${stats.avgMargin.toFixed(0)}%`}
          />
          <KPICard
            icon={Timer} label="Dias p/ Vender"
            value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}d` : "—"}
            sublabel={stats.avgDaysToSell > 30 ? "⚠️ Acima do ideal (30d)" : "✅ Dentro do saudável"}
            warning={stats.avgDaysToSell > 30}
            detail={stats.capitalAtRisk > 0 ? `${fmtK(stats.capitalAtRisk)} em risco` : "Sem capital em risco"}
          />
          <KPICard
            icon={Activity} label="Performance"
            value={stats.avgMargin > 0 ? `${stats.avgMargin.toFixed(0)}%` : "—"}
            sublabel={stats.avgMargin >= 20 ? "Margem excelente" : stats.avgMargin >= 10 ? "Margem moderada" : "Margem baixa"}
            warning={stats.avgMargin > 0 && stats.avgMargin < 10}
            highlight={stats.avgMargin >= 20}
            detail={`${stats.totalSales} vendas totais`}
          />
        </div>
      </div>

      {/* ───── INVENTORY HEALTH BAR + QUICK ACTIONS ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Inventory Health - wider */}
        <Card className="lg:col-span-3 p-6 border-border/50">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" /> Saúde do Estoque
            </h2>
            <span className="text-xs text-muted-foreground">{stats.inStock} veículo{stats.inStock !== 1 ? "s" : ""}</span>
          </div>
          {stats.inStock > 0 ? (
            <div className="space-y-5">
              {/* Progress bar */}
              <div className="flex rounded-2xl overflow-hidden h-10 shadow-inner">
                {stats.greenCount > 0 && (
                  <div className="bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground transition-all duration-500"
                    style={{ width: `${Math.max((stats.greenCount / stats.inStock) * 100, 8)}%` }}>
                    {stats.greenCount}
                  </div>
                )}
                {stats.yellowCount > 0 && (
                  <div className="bg-amber-500 flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                    style={{ width: `${Math.max((stats.yellowCount / stats.inStock) * 100, 8)}%` }}>
                    {stats.yellowCount}
                  </div>
                )}
                {stats.redCount > 0 && (
                  <div className="bg-destructive flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
                    style={{ width: `${Math.max((stats.redCount / stats.inStock) * 100, 8)}%` }}>
                    {stats.redCount}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <HealthStat
                  color="bg-primary" label="Saudável" subtitle="< 15 dias"
                  count={stats.greenCount} icon={<CheckCircle2 className="w-4 h-4 text-primary" />}
                />
                <HealthStat
                  color="bg-amber-500" label="Atenção" subtitle="15-30 dias"
                  count={stats.yellowCount} icon={<AlertTriangle className="w-4 h-4 text-amber-500" />}
                />
                <HealthStat
                  color="bg-destructive" label="Crítico" subtitle="30+ dias"
                  count={stats.redCount} icon={<Flame className="w-4 h-4 text-destructive" />}
                />
              </div>
            </div>
          ) : (
            <EmptyState icon={Car} text="Nenhum veículo em estoque" />
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="lg:col-span-2 p-6 border-border/50">
          <h2 className="font-display text-base font-bold mb-5 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Ações Rápidas
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <QuickAction icon={Car} label="Adicionar Veículo" desc="Novo ao estoque" onClick={() => navigate("/estoque")} />
            <QuickAction icon={DollarSign} label="Registrar Venda" desc="Fechar negócio" onClick={() => navigate("/vendas")} />
            <QuickAction icon={ArrowLeftRight} label="Registrar Troca" desc="Entrada + saída" onClick={() => navigate("/trocas")} />
            {(redVehicles.length + yellowVehicles.length) > 0 && (
              <QuickAction icon={Tag} label="Reduzir Preços" desc={`${redVehicles.length + yellowVehicles.length} veículos`} onClick={() => navigate("/estoque")} alert />
            )}
          </div>
        </Card>
      </div>

      {/* ───── VEHICLES NEEDING ACTION ───── */}
      {(redVehicles.length > 0 || yellowVehicles.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight">🚨 Precisam de Ação</h2>
              <p className="text-sm text-muted-foreground mt-1">Estes veículos estão reduzindo seu lucro — aja agora</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate("/estoque")}>
              Ver todos <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {[...redVehicles, ...yellowVehicles].slice(0, 6).map((v) => (
              <VehicleActionCard
                key={v.id} vehicle={v} fmt={fmt} navigate={navigate}
                onMarkSold={() => markSoldMutation.mutate(v.id)}
                onReducePrice={() => handleReducePrice(v)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ───── HIGH DEMAND VEHICLES ───── */}
      {greenVehicles.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-extrabold tracking-tight">🟢 Alta Demanda</h2>
              <p className="text-sm text-muted-foreground mt-1">Veículos com boa margem e giro rápido</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {greenVehicles.slice(0, 4).map((v) => (
              <Card key={v.id}
                className="p-4 border-primary/15 hover:border-primary/30 cursor-pointer transition-all duration-300 hover:shadow-lg group"
                onClick={() => navigate(`/estoque/${v.id}`)}
              >
                {v.photos && v.photos.length > 0 ? (
                  <div className="aspect-[16/10] rounded-xl overflow-hidden mb-3">
                    <img src={v.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  </div>
                ) : (
                  <div className="aspect-[16/10] rounded-xl bg-secondary/30 flex items-center justify-center mb-3">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
                <p className="font-display font-bold text-sm">{v.brand} {v.model} <span className="text-muted-foreground font-normal">{v.year_fab}</span></p>
                <div className="flex items-center justify-between mt-2">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro</p>
                    <p className="font-display text-lg font-black text-primary">+{fmt(v.profit)}</p>
                  </div>
                  <Badge variant="outline" className="text-primary border-primary/30 text-[10px]">{v.days}d • {v.margin.toFixed(0)}%</Badge>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ───── CHART + INSIGHTS SIDEBAR ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2 p-6 border-border/50">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-lg font-bold">Faturamento e Lucro</h2>
              <p className="text-xs text-muted-foreground mt-1">Últimos 12 meses</p>
            </div>
            <div className="flex items-center gap-5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary/30" />
                <span className="text-muted-foreground">Faturamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Lucro</span>
              </div>
            </div>
          </div>
          {stats.chartData.some((d) => d.revenue > 0) ? (
            <ChartContent chartData={stats.chartData} fmt={fmt} />
          ) : (
            <EmptyState icon={BarChart3} text="Registre vendas para ver o gráfico" />
          )}
        </Card>

        {/* Right Sidebar */}
        <div className="space-y-5">
          {/* Financial Summary */}
          <Card className="p-6 border-border/50">
            <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5 text-primary" /> Resumo Financeiro
            </h3>
            <div className="space-y-1">
              <FinanceRow label="Capital investido" value={fmtK(stats.totalInvested)} />
              <FinanceRow label="Valor do estoque" value={fmtK(stats.totalInventoryValue)} positive={stats.totalInventoryValue > stats.totalInvested} />
              <FinanceRow label="Lucro potencial" value={fmtK(stats.totalProfitPotential)} positive={stats.totalProfitPotential > 0} bold />
              <FinanceRow label="Lucro realizado" value={fmtK(stats.totalProfit)} positive={stats.totalProfit > 0} bold />
              <FinanceRow label="Lucro/carro" value={fmtK(stats.profitPerCar)} positive={stats.profitPerCar > 0} />
              <FinanceRow label="Trocas" value={`${stats.tradesCount}`} />
              <FinanceRow label="Lucro em trocas" value={fmtK(stats.tradesProfit)} positive={stats.tradesProfit > 0} />
              {stats.capitalAtRisk > 0 && (
                <FinanceRow label="Capital em risco" value={fmtK(stats.capitalAtRisk)} negative />
              )}
            </div>
          </Card>

          {/* Smart Insights */}
          <Card className="p-6 border-border/50">
            <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Decisões Inteligentes
            </h3>
            <div className="space-y-3">
              {redVehicles.length > 0 && (
                <InsightCard
                  icon={Flame}
                  text={`${redVehicles.length} veículo${redVehicles.length > 1 ? "s" : ""} parado${redVehicles.length > 1 ? "s" : ""} — reduza preços ou promova nas redes`}
                  type="warning"
                  action="Resolver"
                  onAction={() => navigate("/estoque")}
                />
              )}
              {stats.avgDaysToSell > 30 && (
                <InsightCard icon={Clock} text="Giro lento — considere campanhas de descontos em lote" type="warning" />
              )}
              {stats.totalProfitPotential > 0 && (
                <InsightCard icon={TrendingUp} text={`${fmtK(stats.totalProfitPotential)} de lucro potencial aguardando no estoque`} type="positive" />
              )}
              {stats.avgMargin >= 20 && (
                <InsightCard icon={CheckCircle2} text="Margem acima de 20% — estratégia de preço saudável" type="positive" />
              )}
              {stats.highDemandCount > 0 && (
                <InsightCard icon={TrendingUp} text={`${stats.highDemandCount} veículo${stats.highDemandCount > 1 ? "s" : ""} com alta demanda — considere aumentar preço`} type="positive" />
              )}
              {stats.vehicles.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">Adicione veículos para ver insights</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ───── PRIORITY RANKING ───── */}
      <Card className="p-6 border-border/50">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg font-bold">📊 Ranking de Prioridade</h2>
            <p className="text-xs text-muted-foreground mt-1">Ordenado por urgência — mais antigos primeiro</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/estoque")}>
            Ver todos <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {stats.vehicles.length > 0 ? (
          <div className="space-y-2.5">
            {stats.vehicles.slice(0, 8).map((v, i) => (
              <div
                key={v.id}
                className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  v.status === "red" ? "bg-destructive/5 border-destructive/20 hover:border-destructive/40" :
                  v.status === "yellow" ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" :
                  "bg-secondary/20 border-border/30 hover:border-primary/20"
                }`}
                onClick={() => navigate(`/estoque/${v.id}`)}
              >
                <span className={`text-xs font-extrabold w-6 text-center ${
                  i === 0 ? "text-destructive" : i < 3 ? "text-amber-500" : "text-muted-foreground"
                }`}>#{i + 1}</span>
                {v.photos && v.photos.length > 0 ? (
                  <img src={v.photos[0]} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Car className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  v.status === "red" ? "bg-destructive animate-pulse" : v.status === "yellow" ? "bg-amber-500" : "bg-primary"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{v.brand} {v.model} <span className="font-normal text-muted-foreground">{v.year_fab}</span></p>
                  <p className="text-xs text-muted-foreground mt-0.5">{v.days}d em estoque • Custo: {fmt(v.total_cost)}</p>
                </div>
                <div className="text-right shrink-0 mr-1">
                  <p className={`text-sm font-extrabold ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{v.margin.toFixed(0)}% margem</p>
                </div>
                <div className="shrink-0 hidden sm:block">
                  <Badge variant="outline" className={`text-[10px] ${
                    v.status === "red" ? "border-destructive/30 text-destructive" :
                    v.status === "yellow" ? "border-amber-500/30 text-amber-600 dark:text-amber-400" :
                    "border-primary/30 text-primary"
                  }`}>
                    {v.suggestion}
                  </Badge>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Car} text="Adicione veículos ao estoque" />
        )}
      </Card>
    </div>
  );
};

/* ─────────── SUB-COMPONENTS ─────────── */

const VehicleActionCard = ({ vehicle: v, fmt, navigate, onMarkSold, onReducePrice }: {
  vehicle: VehicleAging; fmt: (v: number) => string; navigate: (path: string) => void;
  onMarkSold: () => void; onReducePrice: () => void;
}) => {
  const firstPhoto = v.photos && v.photos.length > 0 ? v.photos[0] : null;
  return (
    <Card
      className={`overflow-hidden border-2 hover:shadow-xl transition-all duration-300 cursor-pointer group ${
        v.status === "red" ? "border-destructive/30 hover:border-destructive/50" : "border-amber-500/30 hover:border-amber-500/50"
      }`}
      onClick={() => navigate(`/estoque/${v.id}`)}
    >
      {/* Image */}
      {firstPhoto ? (
        <div className="aspect-[16/9] overflow-hidden relative">
          <img src={firstPhoto} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <div className="absolute top-3 right-3">
            <Badge className={`text-xs font-bold shadow-lg ${v.status === "red" ? "bg-destructive text-white" : "bg-amber-500 text-white"}`}>
              {v.days}d parado
            </Badge>
          </div>
          <div className="absolute bottom-3 left-3">
            <p className="text-white font-display font-bold text-base drop-shadow-lg">{v.brand} {v.model}</p>
            <p className="text-white/80 text-xs">{v.year_fab}</p>
          </div>
        </div>
      ) : (
        <div className="aspect-[16/9] bg-secondary/30 flex items-center justify-center relative">
          <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
          <div className="absolute top-3 right-3">
            <Badge className={`text-xs font-bold ${v.status === "red" ? "bg-destructive text-white" : "bg-amber-500 text-white"}`}>
              {v.days}d parado
            </Badge>
          </div>
        </div>
      )}
      <div className="p-5">
        {!firstPhoto && (
          <div className="mb-3">
            <h3 className="font-display font-bold">{v.brand} {v.model}</h3>
            <p className="text-xs text-muted-foreground">{v.year_fab}</p>
          </div>
        )}
        {/* Financial grid */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Custo</p>
            <p className="font-display text-sm font-bold mt-0.5">{fmt(v.total_cost)}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Lucro</p>
            <p className={`font-display text-sm font-extrabold mt-0.5 ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
              {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Margem</p>
            <p className={`font-display text-sm font-extrabold mt-0.5 ${v.margin >= 20 ? "text-primary" : v.margin >= 10 ? "text-amber-500" : "text-destructive"}`}>
              {v.margin.toFixed(0)}%
            </p>
          </div>
        </div>
        {/* Suggestion */}
        <div className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold mb-4 ${
          v.status === "red"
            ? "bg-destructive/8 text-destructive border border-destructive/15"
            : "bg-amber-500/8 text-amber-600 dark:text-amber-400 border border-amber-500/15"
        }`}>
          💡 {v.suggestion}
        </div>
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs h-9 font-semibold"
            onClick={(e) => { e.stopPropagation(); onReducePrice(); }}>
            <Minus className="w-3.5 h-3.5 mr-1" /> -10% Preço
          </Button>
          <Button size="sm" className="flex-1 text-xs h-9 font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={(e) => { e.stopPropagation(); onMarkSold(); }}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Vendido
          </Button>
        </div>
      </div>
    </Card>
  );
};

const QuickAction = ({ icon: Icon, label, desc, onClick, alert }: {
  icon: any; label: string; desc: string; onClick: () => void; alert?: boolean;
}) => (
  <button
    onClick={onClick}
    className={`rounded-xl border p-4 text-left transition-all duration-200 group hover:shadow-md flex items-center gap-3 ${
      alert
        ? "border-destructive/20 bg-destructive/5 hover:border-destructive/40"
        : "border-border/50 hover:border-primary/30 hover:bg-primary/5"
    }`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
      alert ? "bg-destructive/10" : "bg-primary/8"
    }`}>
      <Icon className={`w-5 h-5 ${alert ? "text-destructive" : "text-primary"}`} />
    </div>
    <div>
      <p className="text-sm font-bold">{label}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  </button>
);

const ChartContent = ({ chartData, fmt }: { chartData: { month: string; revenue: number; profit: number }[]; fmt: (v: number) => string }) => {
  const isDark = document.documentElement.classList.contains("dark");
  const gridColor = isDark ? "hsl(220 16% 14%)" : "hsl(220 13% 91%)";
  const tickColor = isDark ? "hsl(220 9% 50%)" : "hsl(220 9% 46%)";
  const tooltipBg = isDark ? "hsl(220 26% 8%)" : "hsl(0 0% 100%)";
  const tooltipBorder = isDark ? "hsl(220 16% 16%)" : "hsl(220 13% 91%)";
  const primaryColor = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  const primary = primaryColor ? `hsl(${primaryColor})` : "hsl(142 71% 45%)";
  const primaryFaded = primaryColor ? `hsl(${primaryColor} / 0.4)` : "hsl(142 71% 45% / 0.4)";

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.12} />
            <stop offset="95%" stopColor={primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.4} />
            <stop offset="95%" stopColor={primary} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
        <XAxis dataKey="month" stroke={tickColor} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
        <YAxis stroke={tickColor} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "14px", fontSize: "12px", padding: "12px" }}
          formatter={(value: number) => [fmt(value), ""]}
        />
        <Area type="monotone" dataKey="revenue" stroke={primaryFaded} strokeWidth={2} fill="url(#revenueGradient)" name="Faturamento" />
        <Area type="monotone" dataKey="profit" stroke={primary} strokeWidth={2.5} fill="url(#profitGradient)" name="Lucro" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const HealthStat = ({ color, label, subtitle, count, icon }: { color: string; label: string; subtitle: string; count: number; icon: React.ReactNode }) => (
  <div className="text-center p-3 rounded-xl bg-secondary/20">
    <div className="flex items-center justify-center gap-2 mb-1">
      {icon}
      <span className="font-display text-2xl font-black">{count}</span>
    </div>
    <p className="text-xs font-semibold">{label}</p>
    <p className="text-[10px] text-muted-foreground">{subtitle}</p>
  </div>
);

const InsightCard = ({ icon: Icon, text, type, action, onAction }: {
  icon: any; text: string; type: "positive" | "warning"; action?: string; onAction?: () => void;
}) => (
  <div className={`rounded-xl p-3.5 text-xs leading-relaxed flex items-start gap-2.5 ${
    type === "positive" ? "bg-primary/5 text-primary/90 border border-primary/10" : "bg-amber-500/5 text-amber-600 dark:text-amber-400 border border-amber-500/10"
  }`}>
    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
    <div className="flex-1">
      <span>{text}</span>
      {action && onAction && (
        <button onClick={onAction} className="block mt-1.5 text-[11px] font-bold underline underline-offset-2 hover:opacity-80 transition-opacity">
          {action} →
        </button>
      )}
    </div>
  </div>
);

const KPICard = ({ icon: Icon, value, sublabel, highlight, warning, detail }: {
  icon: any; label: string; value: string; sublabel: string; highlight?: boolean; warning?: boolean; detail?: string;
}) => (
  <Card className={`p-5 border transition-all duration-300 hover:shadow-lg group ${
    highlight ? "border-primary/25 hover:border-primary/40" : warning ? "border-destructive/25 hover:border-destructive/40" : "border-border/50 hover:border-border"
  }`}>
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${
      warning ? "bg-destructive/10" : "bg-primary/8"
    }`}>
      <Icon className={`w-5 h-5 ${warning ? "text-destructive" : "text-primary"}`} />
    </div>
    <p className={`font-display text-2xl font-black tracking-tight ${highlight ? "text-primary" : warning ? "text-destructive" : ""}`}>{value}</p>
    <p className="text-xs text-muted-foreground mt-1.5">{sublabel}</p>
    {detail && <p className="text-[10px] text-muted-foreground/70 mt-1">{detail}</p>}
  </Card>
);

const FinanceRow = ({ label, value, positive, negative, bold }: {
  label: string; value: string; positive?: boolean; negative?: boolean; bold?: boolean;
}) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/15 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`font-display text-sm ${bold ? "font-extrabold" : "font-bold"} ${
      positive ? "text-primary" : negative ? "text-destructive" : ""
    }`}>{value}</span>
  </div>
);

const EmptyState = ({ icon: Icon, text }: { icon: any; text: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
    <Icon className="w-10 h-10 mb-2 opacity-20" />
    <p className="text-sm">{text}</p>
  </div>
);

export default Dashboard;
