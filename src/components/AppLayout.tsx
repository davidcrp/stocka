import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart3,
  Car,
  DollarSign,
  LogOut,
  Users,
  Zap,
  Menu,
  X,
  Settings,
  Megaphone,
  TrendingUp,
  Bell,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/estoque", icon: Car, label: "Estoque" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/vendas", icon: DollarSign, label: "Vendas" },
  { to: "/analytics", icon: TrendingUp, label: "Análises", disabled: true },
  { to: "/ads", icon: Megaphone, label: "Automação de Anúncios", disabled: true },
  { to: "/settings", icon: Settings, label: "Configurações", disabled: true },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-[240px] bg-[hsl(220,28%,6%)] flex flex-col transition-transform lg:translate-x-0 border-r border-border/50 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-border/30">
          <div className="w-8 h-8 rounded-xl bg-gradient-profit flex items-center justify-center shadow-glow-sm">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">DealPulse</span>
          <button className="lg:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.disabled ? "#" : link.to}
              onClick={(e) => {
                if (link.disabled) e.preventDefault();
                else setSidebarOpen(false);
              }}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  link.disabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : isActive
                    ? "bg-primary/10 text-primary shadow-glow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && !link.disabled && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-glow-sm" />
                  )}
                  <link.icon className={`w-[18px] h-[18px] transition-colors ${isActive && !link.disabled ? "text-primary" : ""}`} />
                  <span>{link.label}</span>
                  {link.disabled && (
                    <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground/50">Em breve</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-border/30">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-secondary/30 transition-colors cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-gradient-profit flex items-center justify-center text-xs font-bold text-primary-foreground shadow-glow-sm">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{profile?.full_name || "Usuário"}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{profile?.role || "vendedor"}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground/60 hover:text-destructive mt-1 text-xs h-8"
            onClick={handleSignOut}
          >
            <LogOut className="w-3.5 h-3.5 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border/30 flex items-center justify-between px-4 md:px-6 glass-strong">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-lg hover:bg-secondary" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden lg:block">
              <h2 className="font-display text-sm font-semibold">Gestão da Loja</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors">
              <Bell className="w-[18px] h-[18px] text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary shadow-glow-sm" />
            </button>
            <div className="w-8 h-8 rounded-full bg-gradient-profit flex items-center justify-center text-xs font-bold text-primary-foreground shadow-glow-sm">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
