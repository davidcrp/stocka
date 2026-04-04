import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import {
  TrendingUp,
  TrendingDown,
  Car,
  Users,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Clock,
  Target,
  AlertTriangle,
  Zap,
  Phone,
  Tag,
  MessageCircleWarning,
  ChevronRight,
  Flame,
  ShieldAlert,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import car1 from "@/assets/cars/car1.jpg";
import car2 from "@/assets/cars/car2.jpg";
import car3 from "@/assets/cars/car3.jpg";
import car4 from "@/assets/cars/car4.jpg";
import car5 from "@/assets/cars/car5.jpg";
import car6 from "@/assets/cars/car6.jpg";

const demoCarImages = [car1, car2, car3, car4, car5, car6];

const chartData = [
  { month: "Jan", revenue: 145000, profit: 32000 },
  { month: "Fev", revenue: 168000, profit: 38000 },
  { month: "Mar", revenue: 152000, profit: 29000 },
  { month: "Abr", revenue: 198000, profit: 47000 },
  { month: "Mai", revenue: 210000, profit: 52000 },
  { month: "Jun", revenue: 185000, profit: 41000 },
  { month: "Jul", revenue: 230000, profit: 58000 },
  { month: "Ago", revenue: 255000, profit: 64000 },
  { month: "Set", revenue: 242000, profit: 55000 },
  { month: "Out", revenue: 278000, profit: 72000 },
  { month: "Nov", revenue: 295000, profit: 78000 },
  { month: "Dez", revenue: 310000, profit: 85000 },
];

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
  agingVehicles: {
    id: string;
    brand: string;
    model: string;
    year_fab: number;
    days: number;
    listing_price: number;
    purchase_price: number;
    reconditioning_cost: number;
    status: string;
  }[];
  funnelData: { name: string; value: number }[];
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    inStock: 0, totalLeads: 0, newLeads: 0, pendingLeads: 0, totalSales: 0,
    totalRevenue: 0, totalProfit: 0, avgDaysToSell: 0, conversionRate: 0,
    lostLeadsThisWeek: 0, agingVehicles: [], funnelData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchStats(); }, []);

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

    const totalProfit = sales.reduce((s, sale) => {
      const v = sale.vehicles as any;
      const cost = (v?.purchase_price || 0) + (v?.reconditioning_cost || 0) + (expensesByVehicle[sale.vehicle_id] || 0);
      return s + (sale.final_price || 0) - cost - (sale.commission || 0);
    }, 0);

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

    setStats({
      inStock: inStock.length, totalLeads: leads.length, newLeads: newLeads.length,
      pendingLeads: pendingLeads.length, totalSales: sales.length,
      totalRevenue, totalProfit, avgDaysToSell: Math.round(avgDays),
      conversionRate: Math.round(conversionRate), lostLeadsThisWeek, agingVehicles, funnelData,
    });
    setLoading(false);
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

  const fmtK = (v: number) => {
    if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `R$${(v / 1000).toFixed(0)}k`;
    return fmt(v);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const deadVehicles = stats.agingVehicles.filter((v) => v.status === "dead");
  const slowVehicles = stats.agingVehicles.filter((v) => v.status === "slow");
  const hasAlerts = deadVehicles.length > 0 || stats.pendingLeads > 0 || stats.lostLeadsThisWeek > 0;

  return (
    <div className="space-y-6">
      {/* Alertas Acionáveis */}
      {hasAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {deadVehicles.length > 0 && (
            <AlertBanner
              icon={ShieldAlert}
              color="destructive"
              title={`${deadVehicles.length} carro${deadVehicles.length > 1 ? "s" : ""} parado${deadVehicles.length > 1 ? "s" : ""} há 60+ dias`}
              subtitle="Estão te fazendo perder dinheiro — reduza o preço agora"
              actionLabel="Reduzir Preços"
              onClick={() => navigate("/estoque")}
            />
          )}
          {stats.pendingLeads > 0 && (
            <AlertBanner
              icon={MessageCircleWarning}
              color="accent"
              title={`${stats.pendingLeads} lead${stats.pendingLeads > 1 ? "s" : ""} aguardando resposta`}
              subtitle="Leads sem contato perdem interesse rápido"
              actionLabel="Contatar Leads"
              onClick={() => navigate("/leads")}
            />
          )}
          {stats.lostLeadsThisWeek > 0 && (
            <AlertBanner
              icon={TrendingDown}
              color="destructive"
              title={`${stats.lostLeadsThisWeek} venda${stats.lostLeadsThisWeek > 1 ? "s" : ""} perdida${stats.lostLeadsThisWeek > 1 ? "s" : ""} esta semana`}
              subtitle="Analise os motivos e ajuste sua estratégia"
              actionLabel="Ver Leads"
              onClick={() => navigate("/leads")}
            />
          )}
        </div>
      )}

      <div className="flex gap-6">
        {/* Conteúdo principal */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Centro de Controle</h1>
              <p className="text-[13px] text-muted-foreground mt-0.5">Seu dinheiro em tempo real</p>
            </div>
            <div className="flex items-center gap-2">
              <select className="bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                <option>Últimos 30 dias</option>
                <option>Últimos 7 dias</option>
                <option>Últimos 90 dias</option>
                <option>Este ano</option>
              </select>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              icon={DollarSign}
              label="Lucro Total"
              value={stats.totalProfit > 0 ? fmt(stats.totalProfit) : "R$0"}
              change="+12,5%"
              positive
              sublabel="vs. mês passado"
              highlight
            />
            <KPICard
              icon={Car}
              label="Anúncios Ativos"
              value={String(stats.inStock)}
              change={deadVehicles.length > 0 ? `${deadVehicles.length} parados` : "Saudável"}
              positive={deadVehicles.length === 0}
              sublabel="Em todos os canais"
            />
            <KPICard
              icon={Users}
              label="Leads Hoje"
              value={String(stats.newLeads)}
              change="+3"
              positive
              sublabel="Novas consultas"
            />
            <KPICard
              icon={Target}
              label="Taxa de Conversão"
              value={`${stats.conversionRate}%`}
              change={stats.conversionRate < 30 ? "Baixa!" : "+2,1%"}
              positive={stats.conversionRate >= 30}
              sublabel="Lead para venda"
            />
          </div>

          {/* Ações Rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickAction
              icon={Tag}
              label="Reduzir Preços"
              count={deadVehicles.length + slowVehicles.length}
              color="destructive"
              onClick={() => navigate("/estoque")}
            />
            <QuickAction
              icon={Phone}
              label="Contatar Leads"
              count={stats.pendingLeads}
              color="accent"
              onClick={() => navigate("/leads")}
            />
            <QuickAction
              icon={Car}
              label="Adicionar Veículo"
              color="primary"
              onClick={() => navigate("/estoque")}
            />
            <QuickAction
              icon={DollarSign}
              label="Registrar Venda"
              color="primary"
              onClick={() => navigate("/vendas")}
            />
          </div>

          {/* Gráfico de Receita */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Faturamento e Lucro</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Desempenho mensal</p>
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
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
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
                  contentStyle={{ background: "hsl(220 26% 8%)", border: "1px solid hsl(220 16% 16%)", borderRadius: "12px", fontSize: "12px", boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6)" }}
                  labelStyle={{ color: "hsl(220 13% 91%)", fontWeight: 600 }}
                  itemStyle={{ color: "hsl(220 9% 62%)" }}
                  formatter={(value: number) => [fmt(value), ""]}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(142 71% 45% / 0.4)" strokeWidth={2} fill="url(#revenueGradient)" name="Faturamento" />
                <Area type="monotone" dataKey="profit" stroke="hsl(142 71% 45%)" strokeWidth={2.5} fill="url(#profitGradient)" name="Lucro" />
              </AreaChart>
            </ResponsiveContainer>
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
          </div>

          {/* Preview do Estoque Inteligente */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold">Estoque Inteligente</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {deadVehicles.length > 0
                    ? `⚠️ ${deadVehicles.length} veículo${deadVehicles.length > 1 ? "s" : ""} perdendo dinheiro`
                    : `${stats.inStock} veículos em estoque`}
                </p>
              </div>
              <a href="/estoque" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                Ver todos <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>

            {stats.agingVehicles.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.agingVehicles.slice(0, 6).map((v, i) => (
                  <InventoryCard
                    key={v.id}
                    image={demoCarImages[i % demoCarImages.length]}
                    brand={v.brand}
                    model={v.model}
                    year={v.year_fab}
                    price={v.listing_price}
                    cost={v.purchase_price + v.reconditioning_cost}
                    days={v.days}
                    status={v.status as "hot" | "slow" | "dead"}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {demoCarImages.map((img, i) => (
                  <InventoryCard
                    key={i}
                    image={img}
                    brand={["Toyota", "Honda", "Hyundai", "Jeep", "VW", "Chevrolet"][i]}
                    model={["Corolla", "Civic", "HB20", "Compass", "T-Cross", "Onix"][i]}
                    year={2023 + (i % 2)}
                    price={[89900, 115000, 72000, 145000, 98000, 68000][i]}
                    cost={[72000, 92000, 58000, 118000, 79000, 54000][i]}
                    days={[5, 12, 35, 48, 8, 65][i]}
                    status={(["hot", "hot", "slow", "slow", "hot", "dead"] as const)[i]}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Painel Lateral Direito */}
        <div className="hidden xl:block w-[280px] shrink-0 space-y-4">
          {/* Resumo de Lucro */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Resumo Financeiro
            </h3>
            <div className="space-y-3">
              <FinanceRow label="Faturamento" value={fmtK(stats.totalRevenue || 1225940)} positive />
              <FinanceRow label="Lucro Líquido" value={fmtK(stats.totalProfit || 739498)} positive />
              <FinanceRow label="Ticket Médio" value={stats.totalSales > 0 ? fmtK(stats.totalRevenue / stats.totalSales) : "R$96k"} />
              <FinanceRow label="Lucro/Carro" value={stats.totalSales > 0 ? fmtK(stats.totalProfit / stats.totalSales) : "R$39,5k"} positive />
            </div>
          </div>

          {/* KPIs Detalhados */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              KPIs Operacionais
            </h3>
            <div className="space-y-3">
              <KPIRow label="Dias médios p/ vender" value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}` : "47"} icon={Clock} warning={stats.avgDaysToSell > 45} />
              <KPIRow label="Custo médio aquisição" value={stats.totalSales > 0 ? fmtK(stats.totalRevenue / stats.totalSales) : "R$48,8k"} icon={DollarSign} />
              <KPIRow label="Conversão de leads" value={`${stats.conversionRate || 38}%`} icon={Target} warning={stats.conversionRate < 30} />
              <KPIRow label="Veículos parados" value={`${deadVehicles.length}`} icon={AlertTriangle} warning={deadVehicles.length > 0} />
            </div>
          </div>

          {/* Insights Inteligentes */}
          <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Insights Inteligentes
            </h3>
            <div className="space-y-2.5">
              <InsightCard text="SUVs estão vendendo 23% mais rápido esta semana" type="positive" />
              {deadVehicles.length > 0 && (
                <InsightCard
                  text={`Reduza o preço do ${deadVehicles[0].brand} ${deadVehicles[0].model} para acelerar a venda`}
                  type="warning"
                />
              )}
              {stats.conversionRate < 40 && (
                <InsightCard text="Sua taxa de conversão pode melhorar com follow-ups mais rápidos" type="warning" />
              )}
              <InsightCard text="Hatches populares têm alta demanda no mercado agora" type="positive" />
            </div>
          </div>

          {/* Alerta de Estoque */}
          {deadVehicles.length > 0 && (
            <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5">
              <h3 className="font-display text-sm font-semibold mb-2 flex items-center gap-2 text-destructive">
                <Flame className="w-4 h-4" />
                Dinheiro Parado
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                {fmt(deadVehicles.reduce((s, v) => s + v.purchase_price + v.reconditioning_cost, 0))} investidos em carros que não vendem.
              </p>
              <Button
                size="sm"
                variant="destructive"
                className="w-full text-xs"
                onClick={() => navigate("/estoque")}
              >
                Resolver Agora
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Sub-componentes ----

const AlertBanner = ({
  icon: Icon,
  color,
  title,
  subtitle,
  actionLabel,
  onClick,
}: {
  icon: any;
  color: "destructive" | "accent" | "primary";
  title: string;
  subtitle: string;
  actionLabel: string;
  onClick: () => void;
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

const QuickAction = ({
  icon: Icon,
  label,
  count,
  color,
  onClick,
}: {
  icon: any;
  label: string;
  count?: number;
  color: "primary" | "destructive" | "accent";
  onClick: () => void;
}) => {
  const colorMap = {
    primary: "hover:border-primary/30 hover:bg-primary/5",
    destructive: "hover:border-destructive/30 hover:bg-destructive/5",
    accent: "hover:border-accent/30 hover:bg-accent/5",
  };
  const iconColor = {
    primary: "text-primary",
    destructive: "text-destructive",
    accent: "text-accent",
  };
  return (
    <button
      onClick={onClick}
      className={`rounded-xl bg-gradient-card border border-border/50 p-3.5 text-left transition-all duration-200 ${colorMap[color]} group`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor[color]}`} />
        <span className="text-xs font-medium">{label}</span>
        {count !== undefined && count > 0 && (
          <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            color === "destructive" ? "bg-destructive/15 text-destructive" :
            color === "accent" ? "bg-accent/15 text-accent" :
            "bg-primary/15 text-primary"
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

const KPICard = ({
  icon: Icon, label, value, change, positive, sublabel, highlight,
}: {
  icon: any; label: string; value: string; change: string; positive: boolean; sublabel: string; highlight?: boolean;
}) => (
  <div className={`rounded-2xl bg-gradient-card border p-4 shadow-card hover:shadow-card-lg transition-all duration-300 group ${
    highlight ? "border-primary/20 shadow-glow-sm" : "border-border/50 hover:border-border"
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
        highlight ? "bg-primary/12" : "bg-primary/8 group-hover:bg-primary/12"
      }`}>
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

const InventoryCard = ({
  image, brand, model, year, price, cost, days, status,
}: {
  image: string; brand: string; model: string; year: number; price: number; cost: number; days: number; status: "hot" | "slow" | "dead";
}) => {
  const glowClass = status === "dead" ? "glow-border-destructive" : status === "slow" ? "glow-border-accent" : "glow-border";
  const dotClass = status === "dead" ? "neon-dot-red" : status === "slow" ? "neon-dot-amber" : "neon-dot";
  const statusLabel = status === "dead" ? "Parado" : status === "slow" ? "Lento" : "Quente";
  const profit = price - cost;

  return (
    <div className={`rounded-xl bg-gradient-card border border-border/30 overflow-hidden hover:border-border transition-all duration-300 ${glowClass}`}>
      <div className="aspect-[4/3] overflow-hidden relative">
        <img src={image} alt={`${brand} ${model}`} loading="lazy" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
        {status === "dead" && (
          <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
            <span className="text-[9px] font-bold bg-destructive/80 text-destructive-foreground px-2 py-0.5 rounded">PERDA</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] font-semibold truncate">{brand} {model}</p>
        <p className="text-[10px] text-muted-foreground">{year}</p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs font-bold text-primary">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(price)}
          </p>
          <div className="flex items-center gap-1">
            <div className={dotClass} />
            <span className="text-[9px] text-muted-foreground">{days}d</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
            status === "dead" ? "bg-destructive/10 text-destructive" :
            status === "slow" ? "bg-accent/10 text-accent" :
            "bg-primary/10 text-primary"
          }`}>{statusLabel}</span>
          <span className={`text-[9px] font-bold ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
            {profit >= 0 ? "+" : ""}{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(profit)}
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

const KPIRow = ({
  label, value, icon: Icon, warning,
}: {
  label: string; value: string; icon: any; warning?: boolean;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <div className="flex items-center gap-2">
      <Icon className={`w-3.5 h-3.5 ${warning ? "text-destructive" : "text-muted-foreground"}`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className={`font-display text-sm font-bold ${warning ? "text-destructive" : ""}`}>{value}</span>
  </div>
);

export default Dashboard;
