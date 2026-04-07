import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import {
  BarChart3, Package, LogOut, Menu, X, Settings, Sun, Moon, ArrowLeftRight, Users, Crown, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import MobileBottomNav from "@/components/MobileBottomNav";
import icon from "@/assets/icon.png";
import TrialBanner from "@/components/TrialBanner";

const links = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/estoque", icon: Package, label: "Estoque" },
  { to: "/trocas", icon: ArrowLeftRight, label: "Trocas" },
  { to: "/configuracoes", icon: Settings, label: "Configurações" },
  { to: "/assinatura", icon: CreditCard, label: "Meu Plano" },
];

const adminLinks = [
  { to: "/equipe", icon: Users, label: "Equipe" },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const { profile, signOut } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
    mainRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-[240px] bg-sidebar-background flex flex-col transition-transform lg:translate-x-0 border-r border-border/50 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-border/30">
          <img src={icon} alt="Stocka" className="h-7 w-7" />
          <span className="font-display text-lg font-bold tracking-tight">Stocka</span>
          <button className="lg:hidden ml-auto p-1" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                  isActive ? "bg-primary/10 text-primary shadow-glow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-glow-sm" />}
                  <link.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-primary" : ""}`} />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {(profile?.role === "admin" || profile?.role === "gestor") && (
            <>
              <div className="border-t border-border/30 my-3" />
              {adminLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                      isActive ? "bg-primary/10 text-primary shadow-glow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary shadow-glow-sm" />}
                      <link.icon className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-primary" : ""}`} />
                      <span>{link.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </>
          )}

          {(profile as any)?.is_superadmin && (
            <>
              <div className="border-t border-border/30 my-3" />
              <NavLink
                to="/master"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${
                    isActive ? "bg-amber-500/10 text-amber-500 shadow-glow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-500 shadow-glow-sm" />}
                    <Crown className={`w-[18px] h-[18px] transition-colors ${isActive ? "text-amber-500" : ""}`} />
                    <span>Painel Master</span>
                  </>
                )}
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border/30">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
            <div className="w-8 h-8 rounded-full bg-gradient-profit flex items-center justify-center text-xs font-bold text-primary-foreground shadow-glow-sm">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{profile?.full_name || "Usuário"}</p>
              <p className="text-[11px] text-muted-foreground capitalize">{profile?.role || "vendedor"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground/60 hover:text-destructive mt-1 text-xs h-8" onClick={handleSignOut}>
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border/30 flex items-center px-4 md:px-6 glass-strong">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-secondary mr-3" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <h2 className="font-display text-sm font-semibold">Gestão do Negócio</h2>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleMode} title={mode === "dark" ? "Modo claro" : "Modo escuro"}>
              {mode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </header>
        <TrialBanner />
        <main ref={mainRef} className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default AppLayout;
