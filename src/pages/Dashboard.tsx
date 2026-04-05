import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Car, DollarSign, BarChart3,
  ArrowUpRight, Clock, Zap, Tag, ChevronRight, Flame, ShieldAlert,
  Wallet, Timer, Target, ArrowLeftRight, CheckCircle2,
  Image as ImageIcon,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type VehicleAging = {
  id: string; brand: string; model: string; year_fab: number;
  days: number; listing_price: number; total_cost: number;
  profit: number; margin: number; status: "green" | "yellow" | "red";
  suggestion: string; photos: string[] | null;
  vehicleStatus: string;
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
    if (days >= 30 && margin > 15) suggestion = "Reduza o preço agora";
    else if (days >= 30 && margin <= 15) suggestion = "Promova urgentemente";
    else if (days >= 15 && days < 30 && margin > 25) suggestion = "Considere reduzir preço";
    else if (days < 15 && margin > 20) suggestion = "Pode aumentar preço";

    return {
      id: v.id, brand: v.brand, model: v.model, year_fab: v.year_fab,
      days, listing_price: listingPrice, total_cost: totalCost,
      profit, margin, status, suggestion, photos: v.photos,
      vehicleStatus: v.status || "em_estoque",
    };
  }).sort((a, b) => b.days - a.days);

  const tradesCount = trades.length;
  const tradesProfit = trades.reduce((s: number, t: any) => s + (t.profit || 0), 0);
  const avgMargin = agingVehicles.length > 0
    ? agingVehicles.reduce((s, v) => s + v.margin, 0) / agingVehicles.length : 0;
  const profitPerCar = sales.length > 0 ? totalProfit / sales.length : 0;

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
  };
};

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 15_000,
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

  const profitChangeNum = stats.prevMonthProfit > 0
    ? ((stats.thisMonthProfit - stats.prevMonthProfit) / stats.prevMonthProfit * 100)
    : stats.thisMonthProfit > 0 ? 100 : 0;
  const profitPositive = profitChangeNum >= 0;

  return (
    <div className="space-y-6">
      {/* ───── ALERT BANNER ───── */}
      {redVehicles.length > 0 && (
        <div
          className="rounded-xl border-2 border-destructive/30 bg-destructive/8 p-4 cursor-pointer hover:bg-destructive/12 transition-colors"
          onClick={() => navigate("/estoque")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-destructive">
                {redVehicles.length} veículo{redVehicles.length > 1 ? "s" : ""} parado{redVehicles.length > 1 ? "s" : ""} há 30+ dias
              </p>
              <p className="text-xs text-destructive/70 mt-0.5">
                {fmt(redVehicles.reduce((s, v) => s + v.total_cost, 0))} de capital preso — ação imediata necessária
              </p>
            </div>
            <Button size="sm" variant="destructive" className="shrink-0 text-xs">
              Resolver <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ───── HEADER ───── */}
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Centro de Controle</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão completa do seu negócio</p>
      </div>

      {/* ───── HERO PROFIT CARD + KPIs ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Hero Profit */}
        <Card className="lg:col-span-1 p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20 shadow-glow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-8 translate-x-8" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-5 h-5 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Lucro Este Mês</span>
            </div>
            <p className="font-display text-4xl font-extrabold tracking-tight mt-2">
              {fmt(stats.thisMonthProfit)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                profitPositive ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
              }`}>
                {profitPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {profitChangeNum >= 0 ? "+" : ""}{profitChangeNum.toFixed(1)}%
              </div>
              <span className="text-xs text-muted-foreground">vs mês anterior</span>
            </div>
            <div className="mt-4 pt-4 border-t border-primary/10 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendas</p>
                <p className="font-display text-lg font-bold">{stats.thisMonthSales}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro/Carro</p>
                <p className="font-display text-lg font-bold text-primary">{fmtK(stats.profitPerCar)}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          <KPICard
            icon={Wallet} label="Capital Investido" value={fmtK(stats.totalInvested)}
            sublabel={`${stats.inStock} veículos em estoque`}
          />
          <KPICard
            icon={Target} label="Lucro Potencial" value={fmtK(stats.totalProfitPotential)}
            sublabel={`Estoque vale ${fmtK(stats.totalInventoryValue)}`}
            highlight={stats.totalProfitPotential > 0}
          />
          <KPICard
            icon={Timer} label="Dias Médios p/ Vender"
            value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}d` : "—"}
            sublabel={stats.avgDaysToSell > 30 ? "⚠️ Acima do ideal" : "Dentro do saudável"}
            warning={stats.avgDaysToSell > 30}
          />
          <KPICard
            icon={BarChart3} label="Margem Média"
            value={stats.avgMargin > 0 ? `${stats.avgMargin.toFixed(0)}%` : "—"}
            sublabel={stats.avgMargin >= 20 ? "Ótima margem" : stats.avgMargin >= 10 ? "Margem moderada" : "Margem baixa"}
            warning={stats.avgMargin > 0 && stats.avgMargin < 10}
            highlight={stats.avgMargin >= 20}
          />
        </div>
      </div>

      {/* ───── INVENTORY HEALTH + QUICK ACTIONS ───── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Inventory Health */}
        <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
          <h2 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Saúde do Estoque
          </h2>
          {stats.inStock > 0 ? (
            <div className="space-y-4">
              <div className="flex rounded-full overflow-hidden h-7">
                {stats.greenCount > 0 && (
                  <div className="bg-primary/80 flex items-center justify-center text-[11px] font-bold text-primary-foreground transition-all"
                    style={{ width: `${(stats.greenCount / stats.inStock) * 100}%` }}>
                    {stats.greenCount}
                  </div>
                )}
                {stats.yellowCount > 0 && (
                  <div className="bg-amber-500/80 flex items-center justify-center text-[11px] font-bold text-white transition-all"
                    style={{ width: `${(stats.yellowCount / stats.inStock) * 100}%` }}>
                    {stats.yellowCount}
                  </div>
                )}
                {stats.redCount > 0 && (
                  <div className="bg-destructive/80 flex items-center justify-center text-[11px] font-bold text-white transition-all"
                    style={{ width: `${(stats.redCount / stats.inStock) * 100}%` }}>
                    {stats.redCount}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <HealthStat color="bg-primary" label="Saudável (<15d)" count={stats.greenCount} />
                <HealthStat color="bg-amber-500" label="Atenção (15-30d)" count={stats.yellowCount} />
                <HealthStat color="bg-destructive" label="Crítico (30d+)" count={stats.redCount} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum veículo em estoque</p>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
          <h2 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Ações Rápidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction icon={Car} label="Adicionar Veículo" desc="Novo ao estoque" onClick={() => navigate("/estoque")} />
            <QuickAction icon={DollarSign} label="Registrar Venda" desc="Fechar negócio" onClick={() => navigate("/vendas")} />
            <QuickAction icon={ArrowLeftRight} label="Registrar Troca" desc="Entrada + saída" onClick={() => navigate("/trocas")} />
            {(redVehicles.length + yellowVehicles.length) > 0 ? (
              <QuickAction icon={Tag} label="Reduzir Preços" desc={`${redVehicles.length + yellowVehicles.length} veículos`} onClick={() => navigate("/estoque")} alert />
            ) : (
              <QuickAction icon={Target} label="Ver Estoque" desc="Todos os veículos" onClick={() => navigate("/estoque")} />
            )}
          </div>
        </Card>
      </div>

      {/* ───── VEHICLES NEEDING ACTION ───── */}
      {(redVehicles.length > 0 || yellowVehicles.length > 0) && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-bold">Veículos que Precisam de Ação</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Estes veículos estão impactando seu lucro</p>
            </div>
            <button onClick={() => navigate("/estoque")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium">
              Ver todos <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...redVehicles, ...yellowVehicles].slice(0, 6).map((v) => (
              <VehicleActionCard key={v.id} vehicle={v} fmt={fmt} navigate={navigate} />
            ))}
          </div>
        </div>
      )}

      {/* ───── CHART + SIDEBAR ───── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2 p-5 bg-gradient-card border-border/50 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Faturamento e Lucro</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos 12 meses</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/40" />
                <span className="text-muted-foreground">Faturamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Lucro</span>
              </div>
            </div>
          </div>
          {stats.chartData.some((d) => d.revenue > 0) ? (
            <ChartContent chartData={stats.chartData} fmt={fmt} />
          ) : (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Registre vendas para ver o gráfico</p>
              </div>
            </div>
          )}
        </Card>

        {/* Financial Summary Sidebar */}
        <div className="space-y-4">
          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Resumo Financeiro
            </h3>
            <div className="space-y-3">
              <FinanceRow label="Capital investido" value={fmtK(stats.totalInvested)} />
              <FinanceRow label="Valor do estoque" value={fmtK(stats.totalInventoryValue)} positive={stats.totalInventoryValue > stats.totalInvested} />
              <FinanceRow label="Lucro potencial" value={fmtK(stats.totalProfitPotential)} positive={stats.totalProfitPotential > 0} />
              <FinanceRow label="Lucro realizado" value={fmtK(stats.totalProfit)} positive={stats.totalProfit > 0} />
              <FinanceRow label="Lucro/carro" value={fmtK(stats.profitPerCar)} positive={stats.profitPerCar > 0} />
              <FinanceRow label="Trocas realizadas" value={`${stats.tradesCount}`} />
              <FinanceRow label="Lucro em trocas" value={fmtK(stats.tradesProfit)} positive={stats.tradesProfit > 0} />
            </div>
          </Card>

          {/* Smart Insights */}
          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Decisões Inteligentes
            </h3>
            <div className="space-y-2.5">
              {redVehicles.length > 0 && (
                <InsightCard
                  icon={Flame}
                  text={`${redVehicles.length} veículo${redVehicles.length > 1 ? "s" : ""} parado${redVehicles.length > 1 ? "s" : ""} — reduza preços ou promova`}
                  type="warning"
                />
              )}
              {stats.avgDaysToSell > 30 && (
                <InsightCard icon={Clock} text="Média de dias para vender acima de 30 — revise preços" type="warning" />
              )}
              {stats.totalProfitPotential > 0 && (
                <InsightCard icon={TrendingUp} text={`${fmtK(stats.totalProfitPotential)} de lucro potencial no estoque`} type="positive" />
              )}
              {stats.avgMargin >= 20 && (
                <InsightCard icon={CheckCircle2} text="Margem média saudável — mantenha a estratégia" type="positive" />
              )}
              {stats.greenCount > 0 && stats.greenCount === stats.inStock && (
                <InsightCard icon={CheckCircle2} text="Todos os veículos com giro saudável! 🟢" type="positive" />
              )}
              {stats.vehicles.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Adicione veículos para ver insights</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* ───── PRIORITY RANKING ───── */}
      <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display text-lg font-semibold">Ranking de Prioridade</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Quais veículos precisam de ação primeiro</p>
          </div>
          <button onClick={() => navigate("/estoque")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors font-medium">
            Ver todos <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        {stats.vehicles.length > 0 ? (
          <div className="space-y-2">
            {stats.vehicles.slice(0, 7).map((v, i) => (
              <div
                key={v.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  v.status === "red" ? "bg-destructive/5 border-destructive/20 hover:border-destructive/40" :
                  v.status === "yellow" ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" :
                  "bg-secondary/30 border-border/30 hover:border-primary/20"
                }`}
                onClick={() => navigate(`/estoque/${v.id}`)}
              >
                <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>
                {/* Mini photo */}
                {v.photos && v.photos.length > 0 ? (
                  <img src={v.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <Car className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  v.status === "red" ? "bg-destructive animate-pulse" : v.status === "yellow" ? "bg-amber-500" : "bg-primary"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{v.brand} {v.model} {v.year_fab}</p>
                  <p className="text-[11px] text-muted-foreground">{v.days}d em estoque • Margem: {v.margin.toFixed(0)}%</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-bold ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[140px] truncate">{v.suggestion}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Adicione veículos ao estoque</p>
          </div>
        )}
      </Card>
    </div>
  );
};

/* ─────────── SUB-COMPONENTS ─────────── */

const VehicleActionCard = ({ vehicle: v, fmt, navigate }: {
  vehicle: VehicleAging; fmt: (v: number) => string; navigate: (path: string) => void;
}) => {
  const firstPhoto = v.photos && v.photos.length > 0 ? v.photos[0] : null;
  return (
    <Card
      className={`overflow-hidden bg-gradient-card border shadow-card hover:shadow-card-lg transition-all duration-300 cursor-pointer group ${
        v.status === "red" ? "border-destructive/25" : "border-amber-500/25"
      }`}
      onClick={() => navigate(`/estoque/${v.id}`)}
    >
      {/* Image */}
      {firstPhoto ? (
        <div className="aspect-[16/9] overflow-hidden relative">
          <img src={firstPhoto} alt={`${v.brand} ${v.model}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
          <div className="absolute top-2 right-2">
            <Badge className={`text-[10px] ${v.status === "red" ? "bg-destructive text-white" : "bg-amber-500 text-white"}`}>
              {v.days}d parado
            </Badge>
          </div>
        </div>
      ) : (
        <div className="aspect-[16/9] bg-secondary/30 flex items-center justify-center">
          <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-display font-bold text-sm">{v.brand} {v.model}</h3>
            <p className="text-[11px] text-muted-foreground">{v.year_fab}</p>
          </div>
          <div className={`w-2.5 h-2.5 rounded-full mt-1 ${
            v.status === "red" ? "bg-destructive animate-pulse" : "bg-amber-500"
          }`} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lucro</p>
            <p className={`font-display text-lg font-extrabold ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
              {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Margem</p>
            <p className={`font-display text-lg font-extrabold ${v.margin >= 20 ? "text-primary" : v.margin >= 10 ? "text-amber-500" : "text-destructive"}`}>
              {v.margin.toFixed(0)}%
            </p>
          </div>
        </div>
        {/* Suggestion */}
        <div className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-medium ${
          v.status === "red"
            ? "bg-destructive/8 text-destructive border border-destructive/15"
            : "bg-amber-500/8 text-amber-600 dark:text-amber-400 border border-amber-500/15"
        }`}>
          {v.status === "red" ? "🔻" : "⚡"} {v.suggestion}
        </div>
        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="flex-1 text-[11px] h-8" onClick={(e) => { e.stopPropagation(); navigate("/estoque"); }}>
            <Tag className="w-3 h-3 mr-1" /> Reduzir Preço
          </Button>
          <Button size="sm" className="flex-1 text-[11px] h-8 bg-gradient-profit text-primary-foreground" onClick={(e) => { e.stopPropagation(); navigate(`/estoque/${v.id}`); }}>
            <DollarSign className="w-3 h-3 mr-1" /> Vender
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
    className={`rounded-xl border p-4 text-left transition-all duration-200 group hover:shadow-md ${
      alert
        ? "border-destructive/20 bg-destructive/5 hover:border-destructive/40"
        : "border-border/50 bg-gradient-card hover:border-primary/30 hover:bg-primary/5"
    }`}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${
      alert ? "bg-destructive/10" : "bg-primary/8"
    }`}>
      <Icon className={`w-[18px] h-[18px] ${alert ? "text-destructive" : "text-primary"}`} />
    </div>
    <p className="text-xs font-semibold">{label}</p>
    <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
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
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.15} />
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
          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontSize: "12px" }}
          formatter={(value: number) => [fmt(value), ""]}
        />
        <Area type="monotone" dataKey="revenue" stroke={primaryFaded} strokeWidth={2} fill="url(#revenueGradient)" name="Faturamento" />
        <Area type="monotone" dataKey="profit" stroke={primary} strokeWidth={2.5} fill="url(#profitGradient)" name="Lucro" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const HealthStat = ({ color, label, count }: { color: string; label: string; count: number }) => (
  <div className="text-center">
    <div className="flex items-center justify-center gap-1.5 mb-1">
      <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
      <span className="font-display text-lg font-bold">{count}</span>
    </div>
    <p className="text-[10px] text-muted-foreground">{label}</p>
  </div>
);

const InsightCard = ({ icon: Icon, text, type }: { icon: any; text: string; type: "positive" | "warning" }) => (
  <div className={`rounded-lg p-3 text-[11px] leading-relaxed flex items-start gap-2 ${
    type === "positive" ? "bg-primary/5 text-primary/90 border border-primary/10" : "bg-accent/5 text-accent/90 border border-accent/10"
  }`}>
    <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
    <span>{text}</span>
  </div>
);

const KPICard = ({ icon: Icon, value, sublabel, highlight, warning }: {
  icon: any; label: string; value: string; sublabel: string; highlight?: boolean; warning?: boolean;
}) => (
  <Card className={`p-5 bg-gradient-card border shadow-card transition-all duration-300 hover:shadow-card-lg ${
    highlight ? "border-primary/20" : warning ? "border-destructive/20" : "border-border/50 hover:border-border"
  }`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${warning ? "bg-destructive/10" : "bg-primary/8"}`}>
      <Icon className={`w-[18px] h-[18px] ${warning ? "text-destructive" : "text-primary"}`} />
    </div>
    <p className={`font-display text-2xl font-extrabold tracking-tight ${highlight ? "text-primary" : warning ? "text-destructive" : ""}`}>{value}</p>
    <p className="text-[11px] text-muted-foreground mt-1.5">{sublabel}</p>
  </Card>
);

const FinanceRow = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`font-display text-sm font-bold ${positive ? "text-primary" : ""}`}>{value}</span>
  </div>
);

export default Dashboard;
