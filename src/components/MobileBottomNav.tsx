import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Package, Plus, ArrowLeftRight, Settings } from "lucide-react";

const tabs = [
  { to: "/dashboard", icon: BarChart3, label: "Painel" },
  { to: "/estoque", icon: Package, label: "Estoque" },
  { to: "__fab__", icon: Plus, label: "Novo" },
  { to: "/trocas", icon: ArrowLeftRight, label: "Trocas" },
  { to: "/configuracoes", icon: Settings, label: "Config" },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 lg:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-end justify-around h-16 px-1">
        {tabs.map((tab) => {
          if (tab.to === "__fab__") {
            return (
              <button
                key="fab"
                onClick={() => navigate("/estoque")}
                className="relative -mt-5 flex flex-col items-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary shadow-glow flex items-center justify-center active:scale-95 transition-transform">
                  <Plus className="w-7 h-7 text-primary-foreground" />
                </div>
                <span className="text-[10px] font-medium text-primary mt-1">Novo</span>
              </button>
            );
          }
          const isActive = location.pathname === tab.to || location.pathname.startsWith(tab.to + "/");
          return (
            <button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[60px] transition-colors ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <tab.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
              <span className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}>{tab.label}</span>
              {isActive && <div className="w-5 h-0.5 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
