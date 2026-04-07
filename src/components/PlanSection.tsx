import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Crown, Check, Zap, Timer, Package, BarChart3, ArrowLeftRight,
  Users, FileText, Shield, Bell, Palette, MessageSquare, Car,
} from "lucide-react";

const allBenefits = [
  { icon: Package, label: "Gestão completa de estoque e produtos" },
  { icon: BarChart3, label: "Dashboard com métricas em tempo real" },
  { icon: Car, label: "Controle de compras e vendas" },
  { icon: ArrowLeftRight, label: "Gestão de trocas e negociações" },
  { icon: Users, label: "CRM de leads e clientes" },
  { icon: FileText, label: "Relatórios detalhados de desempenho" },
  { icon: Users, label: "Multi-usuários com permissões" },
  { icon: MessageSquare, label: "Integração com WhatsApp" },
  { icon: Bell, label: "Notificações automáticas" },
  { icon: Palette, label: "Personalização de tema e cores" },
  { icon: Shield, label: "Segurança avançada com criptografia" },
  { icon: Crown, label: "Suporte prioritário" },
];

const PlanSection = () => {
  const { profile } = useAuth();
  const trial = useTrialCountdown();
  const navigate = useNavigate();

  const { data: subscription } = useQuery({
    queryKey: ["my-subscription-full"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    staleTime: 30_000,
  });

  const status = profile?.subscription_status;
  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativo", variant: "default" },
    trial: { label: "Teste Gratuito", variant: "secondary" },
    overdue: { label: "Pagamento Pendente", variant: "destructive" },
    inactive: { label: "Inativo", variant: "destructive" },
  };

  const currentStatus = statusConfig[status || "inactive"] || statusConfig.inactive;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
        <Crown className="w-5 h-5 text-primary" /> Meu Plano
      </h2>

      {/* Current plan status */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Plano Pro
                <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
              </CardTitle>
              <CardDescription>R$29,90/mês • Cobrança mensal automática via ASAAS</CardDescription>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold">R$29,90</span>
              <span className="text-muted-foreground text-xs block">/mês</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Trial countdown */}
          {trial.status === "trial" && !trial.isExpired && (
            <div className={`rounded-xl p-4 mb-4 flex items-center justify-between ${
              trial.isUrgent ? "bg-destructive/10 border border-destructive/20" : "bg-amber-500/10 border border-amber-500/20"
            }`}>
              <div className="flex items-center gap-2">
                <Timer className={`w-4 h-4 ${trial.isUrgent ? "text-destructive" : "text-amber-500"}`} />
                <span className={`text-sm font-medium ${trial.isUrgent ? "text-destructive" : "text-amber-500"}`}>
                  Teste gratuito expira em {trial.formatted}
                </span>
              </div>
              <Button
                size="sm"
                variant={trial.isUrgent ? "destructive" : "default"}
                className="gap-1"
                onClick={() => navigate("/assinatura")}
              >
                <Zap className="w-3 h-3" />
                Assinar Agora
              </Button>
            </div>
          )}

          {/* Overdue warning */}
          {status === "overdue" && (
            <div className="rounded-xl p-4 mb-4 bg-destructive/10 border border-destructive/20 flex items-center justify-between">
              <span className="text-sm font-medium text-destructive">
                ⚠️ Seu pagamento está em atraso. Regularize para manter o acesso.
              </span>
              <Button size="sm" variant="destructive" onClick={() => navigate("/assinatura")}>
                Regularizar
              </Button>
            </div>
          )}

          {/* Inactive */}
          {status === "inactive" && (
            <div className="rounded-xl p-4 mb-4 bg-destructive/10 border border-destructive/20 flex items-center justify-between">
              <span className="text-sm font-medium text-destructive">
                Sua assinatura está inativa. Ative para ter acesso completo.
              </span>
              <Button size="sm" variant="destructive" onClick={() => navigate("/assinatura")}>
                Ativar Plano
              </Button>
            </div>
          )}

          {/* Active confirmation */}
          {status === "active" && (
            <div className="rounded-xl p-4 mb-4 bg-primary/5 border border-primary/20 flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">
                Sua assinatura está ativa. Acesso completo à plataforma.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base">Benefícios do Plano Pro</CardTitle>
          <CardDescription>Tudo que está incluído na sua assinatura</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allBenefits.map((benefit) => (
              <div key={benefit.label} className="flex items-center gap-2.5 text-sm">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <benefit.icon className="w-3.5 h-3.5 text-primary" />
                </div>
                <span>{benefit.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action button */}
      {status !== "active" && (
        <Button
          className="w-full h-11 text-base font-semibold gap-2"
          onClick={() => navigate("/assinatura")}
        >
          <Zap className="w-5 h-5" />
          {status === "overdue" ? "Regularizar Pagamento" : "Ativar Plano Pro — R$29,90/mês"}
        </Button>
      )}
    </div>
  );
};

export default PlanSection;
