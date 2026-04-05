import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Car, DollarSign, BarChart3,
  ArrowUpRight, Clock, Zap, Tag,
  ChevronRight, Flame, ShieldAlert, Wallet, Timer, Target,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VehicleAging = {
  id: string; brand: string; model: string; year_fab: number;
  days: number; listing_price: number; total_cost: number;
  profit: number; margin: number; status: "green" | "yellow" | "red";
  suggestion: string;
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
};

const fetchDashboardStats = async (): Promise<Stats> => {
  const [vehiclesRes, salesRes, expensesRes] = await Promise.all([
    supabase.from("vehicles").select("*"),
    supabase.from("sales").select("*, vehicles(purchase_price, reconditioning_cost, transport_cost)"),
    supabase.from("vehicle_expenses").select("vehicle_id, amount"),
  ]);

  const vehicles = vehiclesRes.data || [];
  const sales = salesRes.data || [];
  const expenses = expensesRes.data || [];

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
    if (days >= 30 && margin > 15) suggestion = "🔻 Reduza o preço agora";
    else if (days >= 30 && margin <= 15) suggestion = "🚨 Promova urgentemente";
    else if (days >= 15 && days < 30 && margin > 25) suggestion = "📉 Considere reduzir preço";
    else if (days < 15 && margin > 20) suggestion = "📈 Pode aumentar preço";

    return { id: v.id, brand: v.brand, model: v.model, year_fab: v.year_fab, days, listing_price: listingPrice, total_cost: totalCost, profit, margin, status, suggestion };
  }).sort((a, b) => b.days - a.days);

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

  const redVehicles = (stats.vehicles || []).filter((v) => v.status === "red");
  const yellowVehicles = (stats.vehicles || []).filter((v) => v.status === "yellow");

  const profitChange = stats.prevMonthProfit > 0
    ? `${((stats.thisMonthProfit - stats.prevMonthProfit) / stats.prevMonthProfit * 100).toFixed(1)}%`
    : stats.thisMonthProfit > 0 ? "+100%" : "0%";
  const profitPositive = stats.thisMonthProfit >= stats.prevMonthProfit;

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      {redVehicles.length > 0 && (
        <div className="rounded-xl border p-3.5 bg-destructive/8 border-destructive/20 text-destructive cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => navigate("/estoque")}>
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">
                {redVehicles.length} veículo{redVehicles.length > 1 ? "s" : ""} parado{redVehicles.length > 1 ? "s" : ""} há 30+ dias — custando dinheiro diariamente
              </p>
              <p className="text-[10px] opacity-70 mt-0.5">
                {fmt(redVehicles.reduce((s, v) => s + v.total_cost, 0))} de capital preso
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50" />
          </div>
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1 space-y-6 min-w-0">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Centro de Controle</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Gestão de estoque e lucro em tempo real</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Wallet} label="Capital Investido" value={fmtK(stats.totalInvested)}
              sublabel={`${stats.inStock} veículos em estoque`} />
            <KPICard icon={DollarSign} label="Valor do Estoque" value={fmtK(stats.totalInventoryValue)}
              sublabel={`Lucro potencial: ${fmtK(stats.totalProfitPotential)}`} highlight />
            <KPICard icon={TrendingUp} label="Lucro (mês)" value={fmt(stats.thisMonthProfit)}
              change={profitPositive ? `+${profitChange}` : profitChange} positive={profitPositive}
              sublabel={`${stats.thisMonthSales} vendas`} />
            <KPICard icon={Timer} label="Dias Médios p/ Vender" value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}d` : "—"}
              sublabel={stats.avgDaysToSell > 30 ? "⚠️ Acima do ideal" : "Saudável"}
              warning={stats.avgDaysToSell > 30} />
          </div>

          {/* Inventory Health Bar */}
          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <h2 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Saúde do Estoque
            </h2>
            {stats.inStock > 0 ? (
              <div className="space-y-3">
                <div className="flex rounded-full overflow-hidden h-6">
                  {stats.greenCount > 0 && (
                    <div className="bg-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground"
                      style={{ width: `${(stats.greenCount / stats.inStock) * 100}%` }}>
                      {stats.greenCount}
                    </div>
                  )}
                  {stats.yellowCount > 0 && (
                    <div className="bg-amber-500/80 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(stats.yellowCount / stats.inStock) * 100}%` }}>
                      {stats.yellowCount}
                    </div>
                  )}
                  {stats.redCount > 0 && (
                    <div className="bg-destructive/80 flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ width: `${(stats.redCount / stats.inStock) * 100}%` }}>
                      {stats.redCount}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /> &lt;15d ({stats.greenCount})</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> 15-30d ({stats.yellowCount})</span>
                  <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-destructive" /> 30d+ ({stats.redCount})</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum veículo em estoque</p>
            )}
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={Tag} label="Reduzir Preços" count={redVehicles.length + yellowVehicles.length} color="destructive" onClick={() => navigate("/estoque")} />
            <QuickAction icon={Car} label="Adicionar Veículo" color="primary" onClick={() => navigate("/estoque")} />
            <QuickAction icon={DollarSign} label="Registrar Venda" color="primary" onClick={() => navigate("/vendas")} />
            <QuickAction icon={Target} label="Ver Ranking" color="accent" onClick={() => navigate("/estoque")} />
          </div>

          {/* Revenue Chart */}
          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Faturamento e Lucro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos 12 meses</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                  <span className="text-muted-foreground">Faturamento</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Lucro</span>
                </div>
              </div>
            </div>
            {stats.chartData.some((d) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.chartData}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 16% 14%)" />
                  <XAxis dataKey="month" stroke="hsl(220 9% 40%)" tick={{ fontSize: 11, fill: "hsl(220 9% 50%)" }} axisLine={false} tickLine={false} />
                  <YAxis stroke="hsl(220 9% 40%)" tick={{ fontSize: 11, fill: "hsl(220 9% 50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(220 26% 8%)", border: "1px solid hsl(220 16% 16%)", borderRadius: "12px", fontSize: "12px" }}
                    formatter={(value: number) => [fmt(value), ""]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(142 71% 45% / 0.4)" strokeWidth={2} fill="url(#revenueGradient)" name="Faturamento" />
                  <Area type="monotone" dataKey="profit" stroke="hsl(142 71% 45%)" strokeWidth={2.5} fill="url(#profitGradient)" name="Lucro" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                <div className="text-center">
                  <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p>Registre vendas para ver o gráfico</p>
                </div>
              </div>
            )}
          </Card>

          {/* Priority Ranking */}
          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Ranking de Prioridade</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Quais veículos precisam de ação</p>
              </div>
              <button onClick={() => navigate("/estoque")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {stats.vehicles.length > 0 ? (
              <div className="space-y-2">
                {stats.vehicles.slice(0, 5).map((v, i) => (
                  <div key={v.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    v.status === "red" ? "bg-destructive/5 border-destructive/20" :
                    v.status === "yellow" ? "bg-amber-500/5 border-amber-500/20" :
                    "bg-secondary/30 border-border/30"
                  }`}>
                    <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      v.status === "red" ? "bg-destructive" : v.status === "yellow" ? "bg-amber-500" : "bg-primary"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{v.brand} {v.model} {v.year_fab}</p>
                      <p className="text-[10px] text-muted-foreground">{v.days}d em estoque • Margem: {v.margin.toFixed(0)}%</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${v.profit >= 0 ? "text-primary" : "text-destructive"}`}>
                        {v.profit >= 0 ? "+" : ""}{fmt(v.profit)}
                      </p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{v.suggestion}</p>
                    </div>
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

        {/* Sidebar */}
        <div className="hidden xl:block w-[280px] shrink-0 space-y-4">
          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> Resumo Financeiro
            </h3>
            <div className="space-y-3">
              <FinanceRow label="Capital investido" value={fmtK(stats.totalInvested)} />
              <FinanceRow label="Valor do estoque" value={fmtK(stats.totalInventoryValue)} positive={stats.totalInventoryValue > stats.totalInvested} />
              <FinanceRow label="Lucro potencial" value={fmtK(stats.totalProfitPotential)} positive={stats.totalProfitPotential > 0} />
              <FinanceRow label="Lucro realizado" value={fmtK(stats.totalProfit)} positive={stats.totalProfit > 0} />
              <FinanceRow label="Lucro/Carro" value={stats.totalSales > 0 ? fmtK(stats.totalProfit / stats.totalSales) : "R$0"} positive={stats.totalProfit > 0} />
            </div>
          </Card>

          <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> KPIs Operacionais
            </h3>
            <div className="space-y-3">
              <KPIRow label="Dias médios p/ vender" value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}` : "—"} warning={stats.avgDaysToSell > 30} />
              <KPIRow label="Veículos em risco" value={`${stats.redCount}`} warning={stats.redCount > 0} />
              <KPIRow label="Vendas realizadas" value={`${stats.totalSales}`} />
              <KPIRow label="Margem média" value={stats.vehicles.length > 0 ? `${(stats.vehicles.reduce((s, v) => s + v.margin, 0) / stats.vehicles.length).toFixed(0)}%` : "—"} />
            </div>
          </Card>

          {/* Smart Insights */}
          {stats.vehicles.length > 0 && (
            <Card className="p-5 bg-gradient-card border-border/50 shadow-card">
              <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" /> Decisões Inteligentes
              </h3>
              <div className="space-y-2.5">
                {redVehicles.length > 0 && (
                  <InsightCard text={`${redVehicles[0].brand} ${redVehicles[0].model} parado há ${redVehicles[0].days}d — este veículo está custando dinheiro diariamente`} type="warning" />
                )}
                {stats.totalProfitPotential > 0 && (
                  <InsightCard text={`${fmtK(stats.totalProfitPotential)} de lucro potencial no estoque atual`} type="positive" />
                )}
                {stats.avgDaysToSell > 30 && (
                  <InsightCard text="Média de dias para vender acima de 30 — considere revisar preços" type="warning" />
                )}
                {stats.greenCount > 0 && stats.greenCount === stats.inStock && (
                  <InsightCard text="Todos os veículos estão com giro saudável! 🟢" type="positive" />
                )}
              </div>
            </Card>
          )}

          {redVehicles.length > 0 && (
            <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5">
              <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                <Flame className="w-4 h-4" /> Dinheiro Parado
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {fmt(redVehicles.reduce((s, v) => s + v.total_cost, 0))} investidos em veículos que não vendem.
              </p>
              <Button size="sm" variant="destructive" className="w-full text-xs" onClick={() => navigate("/estoque")}>
                Reduzir Preços Agora
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Sub-components ----

const QuickAction = ({ icon: Icon, label, count, color, onClick }: {
  icon: any; label: string; count?: number; color: "primary" | "destructive" | "accent"; onClick: () => void;
}) => {
  const colorMap = {
    primary: "hover:border-primary/30 hover:bg-primary/5",
    destructive: "hover:border-destructive/30 hover:bg-destructive/5",
    accent: "hover:border-accent/30 hover:bg-accent/5",
  };
  const iconColor = { primary: "text-primary", destructive: "text-destructive", accent: "text-accent" };
  return (
    <button onClick={onClick} className={`rounded-xl bg-gradient-card border border-border/50 p-3.5 text-left transition-all duration-200 ${colorMap[color]} group`}>
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor[color]}`} />
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            color === "destructive" ? "bg-destructive/15 text-destructive" : color === "accent" ? "bg-accent/15 text-accent" : "bg-primary/15 text-primary"
          }`}>{count}</span>
        )}
      </div>
    </button>
  );
};

const InsightCard = ({ text, type }: { text: string; type: "positive" | "warning" }) => (
  <div className={`rounded-lg p-2.5 text-[11px] leading-relaxed ${
    type === "positive" ? "bg-primary/5 text-primary/90 border border-primary/10" : "bg-accent/5 text-accent/90 border border-accent/10"
  }`}>
    <span className="mr-1">{type === "positive" ? "📈" : "⚡"}</span>
    {text}
  </div>
);

const KPICard = ({ icon: Icon, value, change, positive, sublabel, highlight, warning }: {
  icon: any; label: string; value: string; change?: string; positive?: boolean; sublabel: string; highlight?: boolean; warning?: boolean;
}) => (
  <div className={`rounded-2xl bg-gradient-card border p-4 shadow-card transition-all duration-300 ${
    highlight ? "border-primary/20 shadow-glow-sm" : warning ? "border-destructive/20" : "border-border/50 hover:border-border"
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${warning ? "bg-destructive/10" : "bg-primary/8"}`}>
        <Icon className={`w-[18px] h-[18px] ${warning ? "text-destructive" : "text-primary"}`} />
      </div>
      {change && (
        <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
          positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
        }`}>
          {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change}
        </div>
      )}
    </div>
    <p className={`font-display text-2xl font-bold tracking-tight ${highlight ? "text-gradient-profit" : warning ? "text-destructive" : ""}`}>{value}</p>
    <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
  </div>
);

const FinanceRow = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`font-display text-sm font-bold ${positive ? "text-primary" : ""}`}>{value}</span>
  </div>
);

const KPIRow = ({ label, value, warning }: { label: string; value: string; warning?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`font-display text-sm font-bold ${warning ? "text-destructive" : ""}`}>{value}</span>
  </div>
);

export default Dashboard;
