import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import { Button } from "@/components/ui/button";
import { Crown, Check, Timer } from "lucide-react";
import AsaasCheckout from "@/components/AsaasCheckout";
import icon from "@/assets/icon.png";

const allBenefits = [
  "Gestão completa de estoque de veículos",
  "Dashboard com métricas de lucro em tempo real",
  "Controle de compra e venda de veículos",
  "Gestão de trocas com cálculo de lucro",
  "Gestão de leads e clientes",
  "Relatórios detalhados de desempenho",
  "Multi-usuários com controle de permissões",
  "Integração com WhatsApp",
  "Notificações e alertas automáticos",
  "Personalização de tema e cores",
  "Segurança com autenticação avançada",
  "Suporte prioritário",
];

const Subscription = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const trial = useTrialCountdown();

  const isTrial = trial.status === "trial" && !trial.isExpired;
  const isOverdue = profile?.subscription_status === "overdue";
  const isActive = profile?.subscription_status === "active";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={icon} alt="Stocka" className="h-10 w-10 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold">Stocka</h1>
          {isActive ? (
            <p className="text-primary text-sm mt-1 font-medium">Sua assinatura está ativa ✓</p>
          ) : (
            <p className="text-muted-foreground text-sm mt-1">
              {isOverdue
                ? "Sua assinatura está com pagamento pendente"
                : isTrial
                  ? "Você está no período de teste gratuito"
                  : "Assine para ter acesso completo à plataforma"}
            </p>
          )}
        </div>

        {/* Trial countdown */}
        {isTrial && (
          <div className={`rounded-2xl border-2 p-6 mb-6 text-center transition-all duration-300 ${
            trial.isUrgent
              ? "border-destructive/60 bg-destructive/5"
              : "border-amber-500/40 bg-amber-500/5"
          } ${trial.isCritical ? "animate-pulse" : ""}`}>
            <div className="flex items-center justify-center gap-2 mb-3">
              <Timer className={`w-5 h-5 ${trial.isUrgent ? "text-destructive" : "text-amber-500"}`} />
              <span className={`text-xs font-semibold uppercase tracking-widest ${
                trial.isUrgent ? "text-destructive" : "text-amber-500"
              }`}>
                Teste gratuito
              </span>
            </div>
            <div className={`font-mono text-5xl lg:text-6xl font-black tracking-tight ${
              trial.isUrgent ? "text-destructive" : "text-foreground"
            }`}>
              {trial.formatted}
            </div>
            <p className={`text-sm mt-3 ${trial.isUrgent ? "text-destructive/80" : "text-muted-foreground"}`}>
              {trial.isUrgent
                ? "⚠️ Seu acesso será bloqueado em breve!"
                : "Tempo restante do período de teste"}
            </p>
          </div>
        )}

        {/* Expired banner */}
        {trial.isExpired && (
          <div className="rounded-2xl border-2 border-destructive/60 bg-destructive/10 p-6 mb-6 text-center">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-lg font-bold text-destructive">Período de teste expirado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Assine agora para continuar usando o sistema
            </p>
          </div>
        )}

        {/* Active status */}
        {isActive && (
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-6 mb-6 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-lg font-bold text-primary">Assinatura ativa</p>
            <p className="text-sm text-muted-foreground mt-1">
              Você tem acesso completo à plataforma
            </p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard")}>
              Ir para o Dashboard
            </Button>
          </div>
        )}

        {!isActive && (
          <div className="rounded-2xl border border-border/50 bg-card p-6 space-y-6">
            {/* Plan card */}
            <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg">Plano Pro</h2>
                  <p className="text-muted-foreground text-xs">Acesso completo • Mensal</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-2xl font-bold">R$29,90</span>
                  <span className="text-muted-foreground text-xs block">/mês</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allBenefits.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span className="text-xs">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Embedded checkout */}
            <AsaasCheckout
              onSuccess={() => {
                refreshProfile();
                navigate("/dashboard");
              }}
            />

            <div className="text-center">
              <button onClick={signOut} className="text-xs text-primary hover:underline">
                Sair da conta
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Subscription;
