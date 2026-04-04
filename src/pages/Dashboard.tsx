import { useEffect, useState } from "react";
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
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import car1 from "@/assets/cars/car1.jpg";
import car2 from "@/assets/cars/car2.jpg";
import car3 from "@/assets/cars/car3.jpg";
import car4 from "@/assets/cars/car4.jpg";
import car5 from "@/assets/cars/car5.jpg";
import car6 from "@/assets/cars/car6.jpg";

const demoCarImages = [car1, car2, car3, car4, car5, car6];

// Demo chart data
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
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  avgDaysToSell: number;
  conversionRate: number;
  agingVehicles: {
    id: string;
    brand: string;
    model: string;
    year_fab: number;
    days: number;
    listing_price: number;
    status: string;
  }[];
};

const Dashboard = () => {
  const [stats, setStats] = useState<Stats>({
    inStock: 0, totalLeads: 0, newLeads: 0, totalSales: 0,
    totalRevenue: 0, totalProfit: 0, avgDaysToSell: 0, conversionRate: 0,
    agingVehicles: [],
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
    const totalRevenue = sales.reduce((s, sale) => s + (sale.final_price || 0), 0);

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
    const conversionRate = leads.length > 0 ? (closedLeads / leads.length) * 100 : 0;

    const agingVehicles = inStock
      .map((v) => ({
        id: v.id, brand: v.brand, model: v.model, year_fab: v.year_fab,
        days: differenceInDays(new Date(), new Date(v.entry_date)),
        listing_price: v.listing_price || 0,
        status: differenceInDays(new Date(), new Date(v.entry_date)) > 60 ? "dead" : differenceInDays(new Date(), new Date(v.entry_date)) > 30 ? "slow" : "hot",
      }))
      .sort((a, b) => b.days - a.days);

    setStats({
      inStock: inStock.length,
      totalLeads: leads.length,
      newLeads: newLeads.length,
      totalSales: sales.length,
      totalRevenue,
      totalProfit,
      avgDaysToSell: Math.round(avgDays),
      conversionRate: Math.round(conversionRate),
      agingVehicles,
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

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className="flex-1 space-y-6 min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Dealership Performance</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">Real-time overview of your operation</p>
          </div>
          <div className="flex items-center gap-2">
            <select className="bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
              <option>Last 30 days</option>
              <option>Last 7 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            icon={DollarSign}
            label="Total Profit"
            value={stats.totalProfit > 0 ? fmt(stats.totalProfit) : "R$0"}
            change="+12.5%"
            positive
            sublabel="vs. last month"
          />
          <KPICard
            icon={Car}
            label="Active Listings"
            value={String(stats.inStock)}
            change={`${stats.agingVehicles.filter(v => v.status === "dead").length} stale`}
            positive={stats.agingVehicles.filter(v => v.status === "dead").length === 0}
            sublabel="Across all channels"
          />
          <KPICard
            icon={Users}
            label="Leads Today"
            value={String(stats.newLeads)}
            change="+3"
            positive
            sublabel="New inquiries"
          />
          <KPICard
            icon={Target}
            label="Conversion Rate"
            value={`${stats.conversionRate}%`}
            change="+2.1%"
            positive
            sublabel="Lead to sale"
          />
        </div>

        {/* Revenue Chart */}
        <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Revenue & Profit</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Monthly performance overview</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary/60" />
                <span className="text-muted-foreground">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span className="text-muted-foreground">Profit</span>
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
              <XAxis
                dataKey="month"
                stroke="hsl(220 9% 40%)"
                tick={{ fontSize: 11, fill: "hsl(220 9% 50%)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="hsl(220 9% 40%)"
                tick={{ fontSize: 11, fill: "hsl(220 9% 50%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(220 26% 8%)",
                  border: "1px solid hsl(220 16% 16%)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6)",
                }}
                labelStyle={{ color: "hsl(220 13% 91%)", fontWeight: 600 }}
                itemStyle={{ color: "hsl(220 9% 62%)" }}
                formatter={(value: number) => [fmt(value), ""]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(142 71% 45% / 0.4)"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                name="Revenue"
              />
              <Area
                type="monotone"
                dataKey="profit"
                stroke="hsl(142 71% 45%)"
                strokeWidth={2.5}
                fill="url(#profitGradient)"
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Inventory Preview */}
        <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-lg font-semibold">Inventory</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{stats.inStock} vehicles in stock</p>
            </div>
            <a href="/estoque" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              View all <ArrowUpRight className="w-3 h-3" />
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
                  days={[5, 12, 35, 48, 8, 65][i]}
                  status={(["hot", "hot", "slow", "slow", "hot", "dead"] as const)[i]}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Panel */}
      <div className="hidden xl:block w-[280px] shrink-0 space-y-4">
        {/* Profit Summary */}
        <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
          <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Profit Summary
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-primary/10 glow-border p-3 text-center">
                <p className="text-xl font-display font-bold text-primary">
                  {stats.totalSales || 127}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Revenue</p>
                <p className="text-xs font-semibold text-primary">{fmtK(stats.totalRevenue || 1225940)}</p>
              </div>
              <div className="rounded-xl bg-primary/10 glow-border p-3 text-center">
                <p className="text-xl font-display font-bold text-primary">
                  {stats.totalSales || 2210}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total Sales</p>
                <p className="text-xs font-semibold text-primary">{fmtK(stats.totalProfit || 739498)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Breakdown */}
        <div className="rounded-2xl bg-gradient-card border border-border/50 p-5 shadow-card">
          <h3 className="font-display text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            KPI Breakdown
          </h3>
          <div className="space-y-3">
            <KPIRow
              label="Avg. days to sell"
              value={stats.avgDaysToSell > 0 ? `${stats.avgDaysToSell}` : "47.3"}
              icon={Clock}
            />
            <KPIRow
              label="Cost per acquisition"
              value={stats.totalSales > 0 ? fmtK(stats.totalRevenue / stats.totalSales) : "R$48.8k"}
              icon={DollarSign}
            />
            <KPIRow
              label="Profit per car"
              value={stats.totalSales > 0 ? fmtK(stats.totalProfit / stats.totalSales) : "R$39.5k"}
              icon={TrendingUp}
            />
            <KPIRow
              label="Conversion rate"
              value={`${stats.conversionRate || 38.6}%`}
              icon={Target}
            />
          </div>
        </div>

        {/* Alerts */}
        {stats.agingVehicles.filter(v => v.status === "dead").length > 0 && (
          <div className="rounded-2xl bg-destructive/5 border border-destructive/20 p-5">
            <h3 className="font-display text-sm font-semibold mb-3 flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              Dead Stock Alert
            </h3>
            <p className="text-xs text-muted-foreground">
              {stats.agingVehicles.filter(v => v.status === "dead").length} vehicles are losing you money. Consider reducing prices.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Sub-components ----

const KPICard = ({
  icon: Icon,
  label,
  value,
  change,
  positive,
  sublabel,
}: {
  icon: any;
  label: string;
  value: string;
  change: string;
  positive: boolean;
  sublabel: string;
}) => (
  <div className="rounded-2xl bg-gradient-card border border-border/50 p-4 shadow-card hover:shadow-card-lg hover:border-border transition-all duration-300 group">
    <div className="flex items-center justify-between mb-3">
      <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
        <Icon className="w-[18px] h-[18px] text-primary" />
      </div>
      <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
        positive ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
      }`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {change}
      </div>
    </div>
    <p className="font-display text-2xl font-bold tracking-tight">{value}</p>
    <p className="text-[11px] text-muted-foreground mt-1">{sublabel}</p>
  </div>
);

const InventoryCard = ({
  image,
  brand,
  model,
  year,
  price,
  days,
  status,
}: {
  image: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  days: number;
  status: "hot" | "slow" | "dead";
}) => {
  const glowClass = status === "dead" ? "glow-border-destructive" : status === "slow" ? "glow-border-accent" : "glow-border";
  const dotClass = status === "dead" ? "neon-dot-red" : status === "slow" ? "neon-dot-amber" : "neon-dot";
  const statusLabel = status === "dead" ? "Dead stock" : status === "slow" ? "Slow" : "Hot";

  return (
    <div className={`rounded-xl bg-gradient-card border border-border/30 overflow-hidden hover:border-border transition-all duration-300 ${glowClass}`}>
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={`${brand} ${model}`}
          loading="lazy"
          className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        />
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
        <div className="mt-1.5">
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${
            status === "dead" ? "bg-destructive/10 text-destructive" :
            status === "slow" ? "bg-accent/10 text-accent" :
            "bg-primary/10 text-primary"
          }`}>
            {statusLabel}
          </span>
        </div>
      </div>
    </div>
  );
};

const KPIRow = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: any;
}) => (
  <div className="flex items-center justify-between py-2 border-b border-border/20 last:border-0">
    <div className="flex items-center gap-2">
      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="font-display text-sm font-bold">{value}</span>
  </div>
);

export default Dashboard;
