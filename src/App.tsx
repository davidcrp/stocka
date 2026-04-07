import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Estoque from "@/pages/Estoque";
import Trocas from "@/pages/Trocas";
import VehicleDetail from "@/pages/VehicleDetail";
import NotFound from "@/pages/NotFound";
import Settings from "@/pages/Settings";
import AdminUsers from "@/pages/AdminUsers";
import SuperAdmin from "@/pages/SuperAdmin";
import Subscription from "@/pages/Subscription";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

const queryClient = new QueryClient();

const PendingScreen = () => (
  <div className="min-h-screen flex items-center justify-center px-4">
    <div className="text-center max-w-sm">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">⏳</span>
      </div>
      <h1 className="font-display text-xl font-bold mb-2">Conta pendente</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Sua conta está aguardando aprovação do administrador. Você será notificado quando o acesso for liberado.
      </p>
      <button
        onClick={() => { import("@/integrations/supabase/client").then(({ supabase }) => supabase.auth.signOut()); }}
        className="text-sm text-primary hover:underline"
      >
        Sair
      </button>
    </div>
  </div>
);

const BlockedScreen = () => {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const isOverdue = profile?.subscription_status === "overdue";

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="font-display text-2xl font-bold mb-3">
          {isOverdue ? "Pagamento pendente" : "Assinatura inativa"}
        </h1>
        <p className="text-muted-foreground mb-8">
          {isOverdue
            ? "Seu pagamento está em atraso. Regularize para continuar usando o sistema."
            : "Sua assinatura não está ativa. Assine para ter acesso completo à plataforma."}
        </p>
        <div className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full h-12 text-base font-semibold"
            onClick={() => navigate("/assinatura")}
          >
            Renovar Agora — R$29,90/mês
          </Button>
          <button onClick={signOut} className="text-sm text-muted-foreground hover:text-primary hover:underline">
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
};

const ProtectedLayout = () => {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.status === "pending") return <PendingScreen />;
  if (profile?.status === "rejected") return <Navigate to="/auth" replace />;

  // Subscription check — superadmins bypass
  const subStatus = profile?.subscription_status;
  if (!profile?.is_superadmin && subStatus !== "active" && subStatus !== "trial") {
    return <BlockedScreen />;
  }

  return <AppLayout><Outlet /></AppLayout>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  if (user && profile?.status === "approved") {
    const subStatus = profile?.subscription_status;
    if (!profile?.is_superadmin && subStatus !== "active" && subStatus !== "trial") {
      return <Navigate to="/assinatura" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  if (user && profile?.status === "pending") return <PendingScreen />;
  return <>{children}</>;
};

const SubscriptionRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <Subscription />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <BusinessProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
              <Route path="/assinatura" element={<SubscriptionRoute />} />
              <Route element={<ProtectedLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/estoque" element={<Estoque />} />
                <Route path="/estoque/:id" element={<VehicleDetail />} />
                <Route path="/trocas" element={<Trocas />} />
                <Route path="/configuracoes" element={<Settings />} />
                <Route path="/equipe" element={<AdminUsers />} />
                <Route path="/master" element={<SuperAdmin />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BusinessProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
