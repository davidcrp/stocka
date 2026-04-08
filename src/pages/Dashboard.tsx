import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/contexts/BusinessContext";
import { differenceInDays, format, startOfMonth, subMonths } from "date-fns";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Package, ArrowLeftRight, BarChart3,
  ChevronRight, ShieldAlert, Clock, AlertTriangle,
  CheckCircle2, Image as ImageIcon, Minus,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

/* ─── Types ─── */
type ItemAging = {
  id: string; brand: string; model: string; year_fab: number;
  days: number; listing_price: number; total_cost: number;
  profit: number; margin: number; status: "green" | "yellow" | "red";
  suggestion: string; photos: string[] | null;
  itemStatus: string; purchase_price: number;
};

type Stats = {
  inStock: number; totalInvested: number; totalInventoryValue: number;
  totalProfitPotential: number; avgDaysToSell: number; totalSales: number;
  totalRevenue: number; totalCostSold: number; totalCommissions: number;
  totalProfit: number; thisMonthRevenue: number; thisMonthProfit: number; thisMonthSales: number;
  prevMonthRevenue: number; prevMonthProfit: number; prevMonthSales: number;
  chartData: { month: string; revenue: number; profit: number }[];
  items: ItemAging[];
  greenCount: number; yellowCount: number; redCount: number;
  tradesCount: number; tradesProfit: number;
  avgMargin: number; profitPerItem: number; avgTicket: number;
  capitalAtRisk: number; highDemandCount: number;
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

  const totalRevenue = sales.reduce((s, sale) => s + (sale.final_price || 0), 0);
  const totalCostSold = sales.reduce((s, sale) => {
    const v = sale.vehicles as any;
    return s + (v?.purchase_price || 0) + (v?.reconditioning_cost || 0) + (v?.transport_cost || 0) + (expensesByVehicle[sale.vehicle_id] || 0);
  }, 0);
  const totalCommissions = sales.reduce((s, sale) => s + (sale.commission || 0), 0);
  const totalProfit = totalRevenue - totalCostSold - totalCommissions;

  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(subMonths(now, 1));

  const thisMonthSalesArr = sales.filter((s) => new Date(s.sale_date) >= thisMonthStart);
  const prevMonthSalesArr = sales.filter((s) => {
    const d = new Date(s.sale_date);
    return d >= prevMonthStart && d < thisMonthStart;
  });

  const thisMonthRevenue = thisMonthSalesArr.reduce((s, sale) => s + (sale.final_price || 0), 0);
  const thisMonthProfit = thisMonthSalesArr.reduce((s, sale) => s + calcProfit(sale), 0);
  const prevMonthRevenue = prevMonthSalesArr.reduce((s, sale) => s + (sale.final_price || 0), 0);
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

  const agingItems: ItemAging[] = inStock.map((v) => {
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
    else if (days < 15 && margin > 20) suggestion = "Margem saudável";

    return {
      id: v.id, brand: v.brand, model: v.model, year_fab: v.year_fab,
      days, listing_price: listingPrice, total_cost: totalCost,
      profit, margin, status, suggestion, photos: v.photos,
      itemStatus: v.status || "em_estoque",
      purchase_price: v.purchase_price || 0,
    };
  }).sort((a, b) => b.days - a.days);

  const tradesCount = trades.length;
  const tradesProfit = trades.reduce((s: number, t: any) => s + (t.profit || 0), 0);
  const avgMargin = agingItems.length > 0
    ? agingItems.reduce((s, v) => s + v.margin, 0) / agingItems.length : 0;
  const profitPerItem = sales.length > 0 ? totalProfit / sales.length : 0;
  const capitalAtRisk = agingItems.filter((v) => v.status === "red").reduce((s, v) => s + v.total_cost, 0);
  const highDemandCount = agingItems.filter((v) => v.status === "green" && v.margin >= 20).length;

  const avgTicket = sales.length > 0 ? totalRevenue / sales.length : 0;

  return {
    inStock: inStock.length, totalInvested, totalInventoryValue, totalProfitPotential,
    avgDaysToSell: Math.round(avgDays), totalSales: sales.length,
    totalRevenue, totalCostSold, totalCommissions, totalProfit,
    thisMonthRevenue, thisMonthProfit, thisMonthSales: thisMonthSalesArr.length,
    prevMonthRevenue, prevMonthProfit, prevMonthSales: prevMonthSalesArr.length,
    chartData, items: agingItems,
    greenCount: agingItems.filter((v) => v.status === "green").length,
    yellowCount: agingItems.filter((v) => v.status === "yellow").length,
    redCount: agingItems.filter((v) => v.status === "red").length,
    tradesCount, tradesProfit, avgMargin, profitPerItem, avgTicket, capitalAtRisk, highDemandCount,
  };
};

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const fmtK = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return fmt(v);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { labels } = useBusiness();
  
  const trial = useTrialCountdown();

  const { data: stats, isLoading } = useQuery({
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
      toast.success(labels.itemSold);
    },
  });

  const reducePriceMutation = useMutation({
    mutationFn: async ({ id, newPrice }: { id: string; newPrice: number }) => {
      const { error } = await supabase.from("vehicles").update({ listing_price: newPrice }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Preço reduzido com sucesso");
    },
  });

  const handleReducePrice = (v: ItemAging) => {
    const newPrice = Math.round(v.listing_price * 0.9);
    reducePriceMutation.mutate({ id: v.id, newPrice });
  };

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 max-w-6xl">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const redItems = stats.items.filter((v) => v.status === "red");
  const yellowItems = stats.items.filter((v) => v.status === "yellow");
  const greenItems = stats.items.filter((v) => v.status === "green");

  const profitChangeNum = stats.prevMonthProfit > 0
    ? ((stats.thisMonthProfit - stats.prevMonthProfit) / stats.prevMonthProfit * 100)
    : stats.thisMonthProfit > 0 ? 100 : 0;
  const profitPositive = profitChangeNum >= 0;

  return (
    <div className="space-y-8 md:space-y-10 lg:space-y-14 max-w-6xl">

      {/* SUBSCRIPTION BANNER */}
      {trial.status === "trial" && !trial.isExpired && (
        <button
          onClick={() => navigate("/assinatura")}
          className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl transition-colors group ${
            trial.isUrgent
              ? "bg-destructive/5 border border-destructive/20 hover:border-destructive/40"
              : "bg-amber-500/5 border border-amber-500/20 hover:border-amber-500/40"
          }`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            trial.isUrgent ? "bg-destructive/10" : "bg-amber-500/10"
          }`}>
            <Clock className={`w-5 h-5 ${trial.isUrgent ? "text-destructive" : "text-amber-500"}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${trial.isUrgent ? "text-destructive" : "text-amber-500"}`}>
              Teste gratuito — {trial.formatted} restantes
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Assine agora para não perder acesso
            </p>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 transition-colors ${
            trial.isUrgent ? "text-destructive/40 group-hover:text-destructive" : "text-amber-500/40 group-hover:text-amber-500"
          }`} />
        </button>
      )}

      {trial.status === "overdue" && (
        <button
          onClick={() => navigate("/assinatura")}
          className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-destructive/5 border border-destructive/20 hover:border-destructive/40 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">Pagamento em atraso</p>
            <p className="text-xs text-muted-foreground mt-0.5">Regularize para evitar bloqueio da conta</p>
          </div>
          <ChevronRight className="w-4 h-4 text-destructive/40 group-hover:text-destructive transition-colors shrink-0" />
        </button>
      )}

      {/* HERO SECTION — Revenue & Profit */}
      <section>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
          {format(new Date(), "MMMM yyyy", { locale: ptBR })}
        </p>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Faturamento do mês */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Faturamento do mês</p>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-none">
                {fmt(stats.thisMonthRevenue)}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">{stats.thisMonthSales} venda{stats.thisMonthSales !== 1 ? "s" : ""} este mês</p>
            </div>
            {/* Lucro do mês */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Lucro do mês</p>
              <h2 className={`font-display text-3xl md:text-4xl lg:text-5xl font-black tracking-tight leading-none ${stats.thisMonthProfit >= 0 ? "text-primary" : "text-destructive"}`}>
                {stats.thisMonthProfit >= 0 ? "+" : ""}{fmt(stats.thisMonthProfit)}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                  profitPositive
                    ? "bg-primary/10 text-primary"
                    : "bg-destructive/10 text-destructive"
                }`}>
                  {profitPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {profitChangeNum >= 0 ? "+" : ""}{profitChangeNum.toFixed(0)}%
                </span>
                <span className="text-[11px] text-muted-foreground">vs mês anterior</span>
              </div>
            </div>
          </div>
          {/* Quick actions */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            <Button variant="outline" onClick={() => navigate("/estoque")} className="text-xs h-11 min-h-[44px] px-4 shrink-0">
              <Package className="w-4 h-4 mr-1.5" /> Ver {labels.stockPage}
            </Button>
            <Button variant="outline" onClick={() => navigate("/vendas")} className="text-xs h-11 min-h-[44px] px-4 shrink-0">
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Nova Venda
            </Button>
            <Button onClick={() => navigate("/trocas")} className="text-xs h-11 min-h-[44px] px-4 shrink-0">
              <ArrowLeftRight className="w-4 h-4 mr-1.5" /> Nova Troca
            </Button>
          </div>
        </div>
      </section>

      {/* SECTION 2 — Alert banner */}
      {redItems.length > 0 && (
        <button
          onClick={() => navigate("/estoque")}
          className="w-full text-left flex items-center gap-4 p-4 rounded-2xl bg-destructive/5 border border-destructive/20 hover:border-destructive/40 transition-colors group"
        >
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-destructive">
              {redItems.length} {redItems.length > 1 ? labels.itemPlural.toLowerCase() : labels.itemSingular.toLowerCase()} parado{redItems.length > 1 ? "s" : ""} há +30 dias
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{fmt(stats.capitalAtRisk)} em capital parado</p>
          </div>
          <ChevronRight className="w-4 h-4 text-destructive/40 group-hover:text-destructive transition-colors shrink-0" />
        </button>
      )}

      {/* SECTION 3 — Key metrics */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-x-6">
        <MetricBlock label="Em estoque" value={String(stats.inStock)} sub={`${fmtK(stats.totalInvested)} investido`} />
        <MetricBlock label="Valor do estoque" value={fmtK(stats.totalInventoryValue)} sub={`Lucro potencial: ${fmtK(stats.totalProfitPotential)}`} highlight={stats.totalProfitPotential > 0} />
        <MetricBlock label="Ticket médio" value={fmtK(stats.avgTicket)} sub={`${stats.totalSales} vendas total`} />
        <MetricBlock label="Dias p/ vender" value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}` : "—"} sub={stats.avgDaysToSell > 30 ? "Acima do ideal" : "Saudável"} warn={stats.avgDaysToSell > 30} />
      </section>

      <div className="border-t border-border/40" />

      {/* SECTION 4 — Inventory health */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-lg lg:text-xl font-bold">Saúde do estoque</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{stats.inStock} {labels.itemPlural.toLowerCase()} em estoque</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/estoque")} className="text-xs text-muted-foreground hover:text-foreground">
            Ver todos <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {stats.inStock > 0 ? (
          <>
            <div className="flex rounded-full overflow-hidden h-2.5 mb-6">
              {stats.greenCount > 0 && <div className="bg-primary transition-all" style={{ width: `${(stats.greenCount / stats.inStock) * 100}%` }} />}
              {stats.yellowCount > 0 && <div className="bg-amber-500 transition-all" style={{ width: `${(stats.yellowCount / stats.inStock) * 100}%` }} />}
              {stats.redCount > 0 && <div className="bg-destructive transition-all" style={{ width: `${(stats.redCount / stats.inStock) * 100}%` }} />}
            </div>
            <div className="flex gap-6 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /><span className="text-muted-foreground">{stats.greenCount} saudável</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-muted-foreground">{stats.yellowCount} atenção</span></span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive" /><span className="text-muted-foreground">{stats.redCount} crítico</span></span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground py-6">Nenhum {labels.itemSingular.toLowerCase()} em estoque</p>
        )}
      </section>

      {/* SECTION 5 — Items needing action */}
      {(redItems.length > 0 || yellowItems.length > 0) && (
        <section>
          <h2 className="font-display text-lg lg:text-xl font-bold mb-1">Precisam de ação</h2>
          <p className="text-xs text-muted-foreground mb-6">Proteja seu lucro — resolva estes primeiro</p>
          <div className="space-y-3">
            {[...redItems, ...yellowItems].slice(0, 6).map((v) => (
              <ItemRow
                key={v.id}
                item={v}
                onNavigate={() => navigate(`/estoque/${v.id}`)}
                onMarkSold={() => markSoldMutation.mutate(v.id)}
                onReducePrice={() => handleReducePrice(v)}
                isSelling={markSoldMutation.isPending}
                isReducing={reducePriceMutation.isPending}
              />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 6 — High demand */}
      {greenItems.length > 0 && (
        <section>
          <h2 className="font-display text-lg lg:text-xl font-bold mb-1">Alta demanda</h2>
          <p className="text-xs text-muted-foreground mb-6">Giro rápido — considere aumentar preço</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 snap-x">
            {greenItems.slice(0, 4).map((v) => (
              <div
                key={v.id}
                onClick={() => navigate(`/estoque/${v.id}`)}
                className="min-w-[240px] lg:min-w-0 snap-start rounded-2xl border border-border/40 hover:border-primary/30 cursor-pointer transition-all duration-200 hover:shadow-md overflow-hidden group"
              >
                {v.photos?.[0] ? (
                  <div className="aspect-[16/10] overflow-hidden">
                    <img src={v.photos[0]} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" loading="lazy" />
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-muted/30 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/15" />
                  </div>
                )}
                <div className="p-4">
                  <p className="text-sm font-semibold">{v.brand} {v.model} <span className="text-muted-foreground font-normal">{v.year_fab}</span></p>
                  <div className="grid grid-cols-2 gap-1 mt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Custo</p>
                      <p className="text-xs font-medium tabular-nums">{fmt(v.total_cost)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Venda</p>
                      <p className="text-xs font-medium tabular-nums">{fmt(v.listing_price)}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border/20">
                    <p className="font-display text-lg font-black text-primary">+{fmt(v.profit)}</p>
                    <p className="text-[11px] text-muted-foreground">{v.days}d · {v.margin.toFixed(0)}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 7 — Revenue chart (hidden on small mobile for speed) */}
      <section className="hidden sm:block">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg lg:text-xl font-bold">Faturamento e lucro</h2>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary/30" /> Faturamento</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" /> Lucro</span>
          </div>
        </div>
        {stats.chartData.some((d) => d.revenue > 0) ? (
          <ChartSection chartData={stats.chartData} />
        ) : (
          <div className="py-16 text-center">
            <BarChart3 className="w-10 h-10 text-muted-foreground/15 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Registre vendas para ver o gráfico</p>
          </div>
        )}
      </section>

      {/* SECTION 8 — Financial breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <h2 className="font-display text-lg font-bold mb-1">Resumo financeiro</h2>
          <p className="text-xs text-muted-foreground mb-4">Valores totais acumulados</p>
          <div className="space-y-0">
            <FinRow label="Faturamento total" value={fmtK(stats.totalRevenue)} bold />
            <FinRow label="Custo dos vendidos" value={`- ${fmtK(stats.totalCostSold)}`} />
            <FinRow label="Comissões pagas" value={`- ${fmtK(stats.totalCommissions)}`} />
            <FinRow label="Lucro líquido realizado" value={fmtK(stats.totalProfit)} positive={stats.totalProfit > 0} bold />
            <FinRow label="Ticket médio" value={fmtK(stats.avgTicket)} />
            <FinRow label={`Lucro médio / ${labels.itemSingular.toLowerCase()}`} value={fmtK(stats.profitPerItem)} positive={stats.profitPerItem > 0} />
            <FinRow label="Margem média" value={`${stats.avgMargin.toFixed(0)}%`} positive={stats.avgMargin >= 15} />
          </div>
        </div>
        <div>
          <h2 className="font-display text-lg font-bold mb-1">Estoque e operações</h2>
          <p className="text-xs text-muted-foreground mb-4">Posição atual do negócio</p>
          <div className="space-y-0">
            <FinRow label="Capital investido (estoque)" value={fmtK(stats.totalInvested)} />
            <FinRow label="Valor de venda do estoque" value={fmtK(stats.totalInventoryValue)} />
            <FinRow label="Lucro potencial (estoque)" value={fmtK(stats.totalProfitPotential)} positive={stats.totalProfitPotential > 0} bold />
            <FinRow label="Total de vendas" value={`${stats.totalSales}`} />
            <FinRow label="Vendas este mês" value={`${stats.thisMonthSales}`} />
            <FinRow label="Faturamento mês anterior" value={fmtK(stats.prevMonthRevenue)} />
            <FinRow label="Trocas realizadas" value={`${stats.tradesCount}`} />
            <FinRow label="Lucro em trocas" value={fmtK(stats.tradesProfit)} positive={stats.tradesProfit > 0} />
            {stats.capitalAtRisk > 0 && <FinRow label="Capital em risco (+30d)" value={fmtK(stats.capitalAtRisk)} negative />}
          </div>
        </div>
      </section>

      {/* SECTION 9 — Priority ranking */}
      {stats.items.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-lg lg:text-xl font-bold">Ranking por urgência</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate("/estoque")} className="text-xs text-muted-foreground">
              Ver todos <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="space-y-1">
            {stats.items.slice(0, 8).map((v, i) => (
              <button
                key={v.id}
                onClick={() => navigate(`/estoque/${v.id}`)}
                className="w-full text-left flex items-center gap-3 py-3 px-1 rounded-xl hover:bg-muted/30 transition-colors group"
              >
                <span className={`text-xs font-bold w-5 text-center tabular-nums ${
                  i < 1 ? "text-destructive" : i < 3 ? "text-amber-500" : "text-muted-foreground/50"
                }`}>{i + 1}</span>

                {v.photos?.[0] ? (
                  <img src={v.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted/40 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                )}

                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  v.status === "red" ? "bg-destructive" : v.status === "yellow" ? "bg-amber-500" : "bg-primary"
                }`} />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{v.brand} {v.model} <span className="text-muted-foreground font-normal">{v.year_fab}</span></p>
                  <p className="text-[11px] text-muted-foreground">{v.days}d em estoque · Custo: {fmt(v.total_cost)}</p>
                </div>

                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-[10px] text-muted-foreground">Venda</p>
                  <p className="text-sm font-medium tabular-nums">{fmt(v.listing_price)}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] text-muted-foreground">Lucro</p>
                  <p className={`text-sm font-bold tabular-nums ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                    {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
                  </p>
                </div>

                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/* SUB-COMPONENTS */
const MetricBlock = ({ label, value, sub, highlight, warn }: {
  label: string; value: string; sub: string; highlight?: boolean; warn?: boolean;
}) => (
  <div className="rounded-2xl bg-card/50 border border-border/30 p-4 lg:p-0 lg:bg-transparent lg:border-0">
    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
    <p className={`font-display text-xl md:text-2xl lg:text-3xl font-black tracking-tight ${
      highlight ? "text-primary" : warn ? "text-destructive" : ""
    }`}>{value}</p>
    <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
  </div>
);

const ItemRow = ({ item: v, onNavigate, onMarkSold, onReducePrice, isSelling, isReducing }: {
  item: ItemAging; onNavigate: () => void;
  onMarkSold: () => void; onReducePrice: () => void;
  isSelling: boolean; isReducing: boolean;
}) => {
  const photo = v.photos?.[0];
  return (
    <div
      className={`flex gap-4 p-3 rounded-2xl border transition-all duration-200 hover:shadow-sm cursor-pointer group ${
        v.status === "red"
          ? "border-destructive/15 hover:border-destructive/30"
          : "border-amber-500/15 hover:border-amber-500/30"
      }`}
      onClick={onNavigate}
    >
      {photo ? (
        <img src={photo} alt="" className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl object-cover shrink-0" loading="lazy" />
      ) : (
        <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-xl bg-muted/30 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-muted-foreground/15" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{v.brand} {v.model} <span className="text-muted-foreground font-normal">{v.year_fab}</span></p>
            <Badge variant="outline" className={`text-[10px] shrink-0 ${
              v.status === "red" ? "border-destructive/30 text-destructive" : "border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}>{v.days}d</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">{v.suggestion}</p>
        </div>

        <div>
          <p className="text-[10px] text-muted-foreground">Custo</p>
          <p className="text-sm font-medium">{fmt(v.total_cost)}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Preço de venda</p>
          <p className="text-sm font-medium">{fmt(v.listing_price)}</p>
        </div>

        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div>
            <p className="text-[10px] text-muted-foreground">Lucro</p>
            <p className={`text-sm font-bold ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
              {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Margem</p>
            <p className="text-sm font-bold">{v.margin.toFixed(0)}%</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            <Button size="sm" variant="outline" className="text-[11px] h-9 min-h-[44px] px-3 md:h-7 md:min-h-0 md:px-2.5" disabled={isReducing}
              onClick={(e) => { e.stopPropagation(); onReducePrice(); }}>
              <Minus className="w-3 h-3 mr-1" /> 10%
            </Button>
            <Button size="sm" className="text-[11px] h-9 min-h-[44px] px-3 md:h-7 md:min-h-0 md:px-2.5" disabled={isSelling}
              onClick={(e) => { e.stopPropagation(); onMarkSold(); }}>
              <CheckCircle2 className="w-3 h-3 mr-1" /> Vendido
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ChartSection = ({ chartData }: { chartData: { month: string; revenue: number; profit: number }[] }) => {
  const isDark = document.documentElement.classList.contains("dark");
  const gridColor = isDark ? "hsl(220 16% 14%)" : "hsl(220 13% 91%)";
  const tickColor = isDark ? "hsl(220 9% 50%)" : "hsl(220 9% 46%)";
  const tooltipBg = isDark ? "hsl(220 26% 10%)" : "hsl(0 0% 100%)";
  const tooltipBorder = isDark ? "hsl(220 16% 16%)" : "hsl(220 13% 91%)";
  const pv = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
  const primary = pv ? `hsl(${pv})` : "hsl(142 71% 45%)";
  const primaryFaded = pv ? `hsl(${pv} / 0.35)` : "hsl(142 71% 45% / 0.35)";

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.08} />
            <stop offset="95%" stopColor={primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={primary} stopOpacity={0.35} />
            <stop offset="95%" stopColor={primary} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
        <XAxis dataKey="month" stroke={tickColor} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} />
        <YAxis stroke={tickColor} tick={{ fontSize: 11, fill: tickColor }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={40} />
        <Tooltip
          contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontSize: "12px", padding: "10px 14px" }}
          formatter={(value: number) => [fmt(value), ""]}
        />
        <Area type="monotone" dataKey="revenue" stroke={primaryFaded} strokeWidth={1.5} fill="url(#revGrad)" name="Faturamento" />
        <Area type="monotone" dataKey="profit" stroke={primary} strokeWidth={2} fill="url(#profitGrad)" name="Lucro" />
      </AreaChart>
    </ResponsiveContainer>
  );
};

const FinRow = ({ label, value, positive, negative, bold }: {
  label: string; value: string; positive?: boolean; negative?: boolean; bold?: boolean;
}) => (
  <div className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`font-display text-sm tabular-nums ${bold ? "font-bold" : "font-medium"} ${
      positive ? "text-primary" : negative ? "text-destructive" : ""
    }`}>{value}</span>
  </div>
);

export default Dashboard;
