import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, Outlet } from "react-router-dom";
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

const ProtectedLayout = () => {
  const { user, loading, profile } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (profile?.status === "pending") return <PendingScreen />;
  if (profile?.status === "rejected") return <Navigate to="/auth" replace />;

  // Subscription check — superadmins bypass
  const subStatus = profile?.subscription_status;
  if (!profile?.is_superadmin && subStatus !== "active") {
    return <Navigate to="/assinatura" replace />;
  }

  return <AppLayout><Outlet /></AppLayout>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  if (user && profile?.status === "approved") {
    const subStatus = profile?.subscription_status;
    if (!profile?.is_superadmin && subStatus !== "active") {
      return <Navigate to="/assinatura" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  if (user && profile?.status === "pending") return <PendingScreen />;
  return <>{children}</>;
};

const SubscriptionRoute = () => {
  const { user, loading, profile } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  // If already subscribed, go to dashboard
  const subStatus = profile?.subscription_status;
  if (profile?.is_superadmin || subStatus === "active") {
    return <Navigate to="/dashboard" replace />;
  }
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
