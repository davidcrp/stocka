import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, Check, Loader2, ShieldCheck, Timer, Zap } from "lucide-react";
import icon from "@/assets/icon.png";

const Subscription = () => {
  const { profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const trial = useTrialCountdown();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");

  // Auto-redirect when trial expires
  useEffect(() => {
    if (trial.isExpired) {
      refreshProfile();
    }
  }, [trial.isExpired, refreshProfile]);

  const handleSubscribe = async () => {
    if (!name.trim() || !cpfCnpj.trim()) {
      toast.error("Preencha o nome e CPF/CNPJ");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão inválida");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/asaas-create-subscription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name, cpfCnpj, phone }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar assinatura");

      toast.success("Assinatura criada com sucesso!");

      if (data.invoiceUrl) {
        window.open(data.invoiceUrl, "_blank");
      }

      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar assinatura");
    } finally {
      setLoading(false);
    }
  };

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

        {/* Trial countdown — big and aggressive */}
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
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => navigate("/dashboard")}
            >
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
                  <p className="text-muted-foreground text-xs">Acesso completo</p>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-2xl font-bold">R$29,90</span>
                  <span className="text-muted-foreground text-xs block">/mês</span>
                </div>
              </div>

              <div className="space-y-2">
                {[
                  "Gestão completa de estoque",
                  "Dashboard com métricas de lucro",
                  "Controle de vendas e trocas",
                  "Gestão de leads",
                  "Relatórios detalhados",
                  "Multi-usuários e equipe",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF ou CNPJ</Label>
                <Input
                  id="cpf"
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <Button
              className={`w-full h-12 text-base font-semibold ${
                trial.isCritical ? "animate-pulse bg-destructive hover:bg-destructive/90" : ""
              }`}
              onClick={handleSubscribe}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Zap className="w-5 h-5 mr-2" />
              )}
              {loading ? "Processando..." : "Ativar Agora — R$29,90/mês"}
            </Button>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Pagamento seguro via ASAAS</span>
              <button onClick={signOut} className="text-primary hover:underline">
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
