import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  TrendingUp, TrendingDown, Car, Users, DollarSign, BarChart3,
  ArrowUpRight, Clock, Target, AlertTriangle, Zap, Phone, Tag,
  MessageCircleWarning, ChevronRight, Flame, ShieldAlert,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type Stats = {
  inStock: number;
  totalLeads: number;
  newLeads: number;
  pendingLeads: number;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  avgDaysToSell: number;
  conversionRate: number;
  lostLeadsThisWeek: number;
  prevMonthProfit: number;
  prevMonthSales: number;
  agingVehicles: {
    id: string; brand: string; model: string; year_fab: number;
    days: number; listing_price: number; purchase_price: number;
    reconditioning_cost: number; status: string;
  }[];
  funnelData: { name: string; value: number }[];
  chartData: { month: string; revenue: number; profit: number }[];
};

const fetchDashboardStats = async (): Promise<Stats> => {
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
    const pendingLeads = leads.filter((l) => l.status === "novo" || l.status === "contactado");
    const totalRevenue = sales.reduce((s, sale) => s + (sale.final_price || 0), 0);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const lostLeadsThisWeek = leads.filter(
      (l) => l.status === "perdido" && new Date(l.updated_at) >= oneWeekAgo
    ).length;

    const expensesByVehicle: Record<string, number> = {};
    expenses.forEach((e) => {
      expensesByVehicle[e.vehicle_id] = (expensesByVehicle[e.vehicle_id] || 0) + (e.amount || 0);
    });

    const calcProfit = (sale: any) => {
      const v = sale.vehicles as any;
      const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0) + (expensesByVehicle[sale.vehicle_id] || 0);
      return (sale.final_price || 0) - cost - (sale.commission || 0);
    };

    const totalProfit = sales.reduce((s, sale) => s + calcProfit(sale), 0);

    // Previous month calculations
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthSales = sales.filter((s) => {
      const d = new Date(s.sale_date);
      return d >= prevMonthStart && d < thisMonthStart;
    });
    const prevMonthProfit = prevMonthSales.reduce((s, sale) => s + calcProfit(sale), 0);

    // Chart: real monthly data (last 12 months)
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

    const closedLeads = leads.filter((l) => l.status === "fechado").length;
    const negotiatingLeads = leads.filter((l) => l.status === "negociando").length;
    const contactedLeads = leads.filter((l) => l.status === "contactado").length;
    const conversionRate = leads.length > 0 ? (closedLeads / leads.length) * 100 : 0;

    const funnelData = [
      { name: "Novos", value: newLeads.length },
      { name: "Contactados", value: contactedLeads },
      { name: "Negociando", value: negotiatingLeads },
      { name: "Fechados", value: closedLeads },
    ];

    const agingVehicles = inStock
      .map((v) => ({
        id: v.id, brand: v.brand, model: v.model, year_fab: v.year_fab,
        days: differenceInDays(new Date(), new Date(v.entry_date)),
        listing_price: v.listing_price || 0,
        purchase_price: v.purchase_price || 0,
        reconditioning_cost: v.reconditioning_cost || 0,
        status: differenceInDays(new Date(), new Date(v.entry_date)) > 60 ? "dead" : differenceInDays(new Date(), new Date(v.entry_date)) > 30 ? "slow" : "hot",
      }))
      .sort((a, b) => b.days - a.days);

    return {
      inStock: inStock.length, totalLeads: leads.length, newLeads: newLeads.length,
      pendingLeads: pendingLeads.length, totalSales: sales.length,
      totalRevenue, totalProfit, avgDaysToSell: Math.round(avgDays),
      conversionRate: Math.round(conversionRate), lostLeadsThisWeek, agingVehicles, funnelData,
      chartData, prevMonthProfit, prevMonthSales: prevMonthSales.length,
    };
};

const Dashboard = () => {
  const navigate = useNavigate();

  const { data: stats, isLoading: loading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: fetchDashboardStats,
    staleTime: 30_000,
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

  const deadVehicles = stats.agingVehicles.filter((v) => v.status === "dead");
  const slowVehicles = stats.agingVehicles.filter((v) => v.status === "slow");
  const hasAlerts = deadVehicles.length > 0 || stats.pendingLeads > 0 || stats.lostLeadsThisWeek > 0;

  // Real month-over-month change
  const profitChange = stats.prevMonthProfit > 0
    ? `${((stats.totalProfit - stats.prevMonthProfit) / stats.prevMonthProfit * 100).toFixed(1)}%`
    : stats.totalProfit > 0 ? "+100%" : "0%";
  const profitPositive = stats.totalProfit >= stats.prevMonthProfit;

  return (
    <div className="space-y-6">
      {/* Alertas Acionáveis */}
      {hasAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {deadVehicles.length > 0 && (
            <AlertBanner icon={ShieldAlert} color="destructive"
              title={`${deadVehicles.length} carro${deadVehicles.length > 1 ? "s" : ""} parado${deadVehicles.length > 1 ? "s" : ""} há 60+ dias`}
              subtitle="Estão te fazendo perder dinheiro — reduza o preço agora"
              actionLabel="Reduzir Preços" onClick={() => navigate("/estoque")}
            />
          )}
          {stats.pendingLeads > 0 && (
            <AlertBanner icon={MessageCircleWarning} color="accent"
              title={`${stats.pendingLeads} lead${stats.pendingLeads > 1 ? "s" : ""} aguardando resposta`}
              subtitle="Leads sem contato perdem interesse rápido"
              actionLabel="Contatar Leads" onClick={() => navigate("/leads")}
            />
          )}
          {stats.lostLeadsThisWeek > 0 && (
            <AlertBanner icon={TrendingDown} color="destructive"
              title={`${stats.lostLeadsThisWeek} venda${stats.lostLeadsThisWeek > 1 ? "s" : ""} perdida${stats.lostLeadsThisWeek > 1 ? "s" : ""} esta semana`}
              subtitle="Analise os motivos e ajuste sua estratégia"
              actionLabel="Ver Leads" onClick={() => navigate("/leads")}
            />
          )}
        </div>
      )}

      <div className="flex gap-6">
        <div className="flex-1 space-y-6 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Centro de Controle</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">Dados em tempo real do seu negócio</p>
            </div>
          </div>

          {/* KPI Cards — all real data */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={DollarSign} label="Lucro Total" value={fmt(stats.totalProfit)}
              change={profitPositive ? `+${profitChange}` : profitChange} positive={profitPositive}
              sublabel={`${stats.totalSales} vendas`} highlight
            />
            <KPICard icon={Car} label="Em Estoque" value={String(stats.inStock)}
              change={deadVehicles.length > 0 ? `${deadVehicles.length} parados` : "Saudável"}
              positive={deadVehicles.length === 0} sublabel={`${fmt(stats.agingVehicles.reduce((s, v) => s + v.purchase_price + v.reconditioning_cost, 0))} investido`}
            />
            <KPICard icon={Users} label="Leads Ativos" value={String(stats.totalLeads)}
              change={`${stats.newLeads} novos`} positive={stats.newLeads > 0}
              sublabel={`${stats.pendingLeads} aguardando`}
            />
            <KPICard icon={Target} label="Taxa de Conversão" value={`${stats.conversionRate}%`}
              change={stats.conversionRate >= 30 ? "Boa" : "Melhorar"} positive={stats.conversionRate >= 30}
              sublabel="Lead → venda"
            />
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction icon={Tag} label="Reduzir Preços" count={deadVehicles.length + slowVehicles.length} color="destructive" onClick={() => navigate("/estoque")} />
            <QuickAction icon={Phone} label="Contatar Leads" count={stats.pendingLeads} color="accent" onClick={() => navigate("/leads")} />
            <QuickAction icon={Car} label="Adicionar Veículo" color="primary" onClick={() => navigate("/estoque")} />
            <QuickAction icon={DollarSign} label="Registrar Venda" color="primary" onClick={() => navigate("/vendas")} />
          </div>

          {/* Gráfico — REAL data */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Faturamento e Lucro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Últimos 12 meses (dados reais)</p>
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
          </div>

          {/* Funil de Vendas */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Funil de Vendas</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Onde estão seus leads agora</p>
              </div>
              <button onClick={() => navigate("/leads")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver CRM <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {stats.funnelData.some((s) => s.value > 0) ? (
              <div className="space-y-3">
                {stats.funnelData.map((stage, i) => {
                  const maxVal = Math.max(...stats.funnelData.map((s) => s.value), 1);
                  const colors = ["bg-muted-foreground", "bg-accent", "bg-primary/70", "bg-primary"];
                  return (
                    <div key={stage.name} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-24 text-right">{stage.name}</span>
                      <div className="flex-1">
                        <Progress value={(stage.value / maxVal) * 100} className={`h-6 bg-secondary/50 [&>div]:${colors[i]}`} />
                      </div>
                      <span className="font-display text-sm font-bold w-8">{stage.value}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Adicione leads para ver o funil</p>
              </div>
            )}
          </div>

          {/* Estoque Preview */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Estoque</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {deadVehicles.length > 0
                    ? `⚠️ ${deadVehicles.length} veículo${deadVehicles.length > 1 ? "s" : ""} perdendo dinheiro`
                    : `${stats.inStock} veículos em estoque`}
                </p>
              </div>
              <button onClick={() => navigate("/estoque")} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>

            {stats.agingVehicles.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {stats.agingVehicles.slice(0, 4).map((v) => (
                  <InventoryCard key={v.id} vehicle={v} fmt={fmt} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Car className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Adicione veículos ao estoque</p>
                <Button size="sm" className="mt-3" onClick={() => navigate("/estoque")}>
                  <Car className="w-4 h-4 mr-2" /> Adicionar Veículo
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Painel Lateral — ALL REAL DATA */}
        <div className="hidden xl:block w-[280px] shrink-0 space-y-4">
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Resumo Financeiro
            </h3>
            <div className="space-y-3">
              <FinanceRow label="Faturamento" value={fmtK(stats.totalRevenue)} positive={stats.totalRevenue > 0} />
              <FinanceRow label="Lucro Líquido" value={fmtK(stats.totalProfit)} positive={stats.totalProfit > 0} />
              <FinanceRow label="Ticket Médio" value={stats.totalSales > 0 ? fmtK(stats.totalRevenue / stats.totalSales) : "R$0"} />
              <FinanceRow label="Lucro/Carro" value={stats.totalSales > 0 ? fmtK(stats.totalProfit / stats.totalSales) : "R$0"} positive={stats.totalProfit > 0} />
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              KPIs Operacionais
            </h3>
            <div className="space-y-3">
              <KPIRow label="Dias médios p/ vender" value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}` : "—"} icon={Clock} warning={stats.avgDaysToSell > 45} />
              <KPIRow label="Conversão de leads" value={`${stats.conversionRate}%`} icon={Target} warning={stats.conversionRate > 0 && stats.conversionRate < 30} />
              <KPIRow label="Veículos parados" value={`${deadVehicles.length}`} icon={AlertTriangle} warning={deadVehicles.length > 0} />
              <KPIRow label="Vendas realizadas" value={`${stats.totalSales}`} icon={DollarSign} />
            </div>
          </div>

          {/* Dynamic insights based on real data */}
          {(deadVehicles.length > 0 || stats.pendingLeads > 0 || stats.totalSales > 0) && (
            <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
              <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Insights
              </h3>
              <div className="space-y-2.5">
                {deadVehicles.length > 0 && (
                  <InsightCard
                    text={`Reduza o preço do ${deadVehicles[0].brand} ${deadVehicles[0].model} — parado há ${deadVehicles[0].days} dias`}
                    type="warning"
                  />
                )}
                {stats.pendingLeads > 0 && (
                  <InsightCard text={`${stats.pendingLeads} leads aguardando contato — responda rápido para não perder`} type="warning" />
                )}
                {stats.conversionRate > 0 && stats.conversionRate < 30 && (
                  <InsightCard text="Taxa de conversão abaixo de 30% — foque em follow-ups mais rápidos" type="warning" />
                )}
                {stats.totalSales > 0 && stats.totalProfit > 0 && (
                  <InsightCard text={`Lucro médio de ${fmtK(stats.totalProfit / stats.totalSales)} por veículo vendido`} type="positive" />
                )}
              </div>
            </div>
          )}

          {deadVehicles.length > 0 && (
            <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5">
              <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                <Flame className="w-4 h-4" />
                Dinheiro Parado
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {fmt(deadVehicles.reduce((s, v) => s + v.purchase_price + v.reconditioning_cost, 0))} investidos em carros que não vendem.
              </p>
              <Button size="sm" variant="destructive" className="w-full text-xs" onClick={() => navigate("/estoque")}>
                Resolver Agora
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Sub-components ----

const AlertBanner = ({ icon: Icon, color, title, subtitle, actionLabel, onClick }: {
  icon: any; color: "destructive" | "accent" | "primary"; title: string; subtitle: string; actionLabel: string; onClick: () => void;
}) => {
  const colorMap = {
    destructive: "bg-destructive/8 border-destructive/20 text-destructive",
    accent: "bg-accent/8 border-accent/20 text-accent",
    primary: "bg-primary/8 border-primary/20 text-primary",
  };
  return (
    <div className={`rounded-xl border p-3.5 ${colorMap[color]} cursor-pointer hover:opacity-90 transition-opacity`} onClick={onClick}>
      <div className="flex items-start gap-2.5">
        <Icon className="w-4 h-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{title}</p>
          <p className="text-[10px] opacity-70 mt-0.5">{subtitle}</p>
        </div>
        <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 opacity-50" />
      </div>
    </div>
  );
};

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

const KPICard = ({ icon: Icon, label, value, change, positive, sublabel, highlight }: {
  icon: any; label: string; value: string; change: string; positive: boolean; sublabel: string; highlight?: boolean;
}) => (
  <div className={`rounded-2xl bg-gradient-card border p-4 shadow-card transition-all duration-300 group ${
    highlight ? "border-primary/20 shadow-glow-sm" : "border-border/50 hover:border-border"
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${highlight ? "bg-primary/12" : "bg-primary/8"}`}>
        <Icon className="w-[18px] h-[18px] text-primary" />
      </div>
      <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        positive ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      }`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
    <p className={`font-display text-2xl font-bold tracking-tight ${highlight ? "text-gradient-profit" : ""}`}>{value}</p>
    <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
  </div>
);

const InventoryCard = ({ vehicle: v, fmt }: { vehicle: any; fmt: (v: number) => string }) => {
  const profit = v.listing_price - v.purchase_price - v.reconditioning_cost;
  const glowClass = v.status === "dead" ? "glow-border-destructive" : v.status === "slow" ? "glow-border-accent" : "glow-border";
  const dotClass = v.status === "dead" ? "neon-dot-red" : v.status === "slow" ? "neon-dot-amber" : "neon-dot";
  const statusLabel = v.status === "dead" ? "Parado" : v.status === "slow" ? "Lento" : "Quente";

  return (
    <div className={`rounded-xl bg-gradient-card border border-border/30 overflow-hidden transition-all duration-300 ${glowClass}`}>
      <div className="p-3">
        <p className="text-[12px] font-semibold truncate">{v.brand} {v.model}</p>
        <p className="text-[10px] text-muted-foreground">{v.year_fab}</p>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs font-bold text-primary">{fmt(v.listing_price)}</p>
          <div className="flex items-center gap-1">
            <div className={dotClass} />
            <span className="text-[9px] text-muted-foreground">{v.days}d</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
            v.status === "dead" ? "bg-destructive/10 text-destructive" : v.status === "slow" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
          }`}>{statusLabel}</span>
          <span className={`text-[9px] font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
            {profit >= 0 ? "+" : ""}{fmt(profit)}
          </span>
        </div>
      </div>
    </div>
  );
};

const FinanceRow = ({ label, value, positive }: { label: string; value: string; positive?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <span className="text-xs text-muted-foreground">{label}</span>
    <span className={`font-display text-sm font-bold ${positive ? "text-primary" : ""}`}>{value}</span>
  </div>
);

const KPIRow = ({ label, value, icon: Icon, warning }: { label: string; value: string; icon: any; warning?: boolean }) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${warning ? "text-destructive" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className={`font-display text-sm font-bold ${warning ? "text-destructive" : ""}`}>{value}</span>
  </div>
);

export default Dashboard;
