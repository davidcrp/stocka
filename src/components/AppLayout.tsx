import { ReactNode } from "react";
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
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/estoque", icon: Car, label: "Estoque" },
  { to: "/leads", icon: Users, label: "Leads" },
  { to: "/vendas", icon: DollarSign, label: "Vendas" },
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
    <div className="min-h-screen flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 border-r border-border bg-card flex flex-col transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-profit flex items-center justify-center">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">DealPulse</span>
          <button className="lg:hidden ml-auto" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`
              }
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
              {profile?.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || "Usuário"}</p>
              <p className="text-xs text-muted-foreground capitalize">{profile?.role || "vendedor"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center px-4 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display text-lg font-bold ml-3">DealPulse</span>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
