import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Crown, Check, Loader2, ShieldCheck } from "lucide-react";
import icon from "@/assets/icon.png";

const Subscription = () => {
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(profile?.full_name || "");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");

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

      // Reload to update subscription status
      setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar assinatura");
    } finally {
      setLoading(false);
    }
  };

  const isOverdue = profile?.subscription_status === "overdue";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={icon} alt="Stocka" className="h-10 w-10 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold">Stocka</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isOverdue
              ? "Sua assinatura está com pagamento pendente"
              : "Assine para ter acesso completo à plataforma"}
          </p>
        </div>

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
            className="w-full h-12 text-base font-semibold"
            onClick={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="w-5 h-5 mr-2" />
            )}
            {loading ? "Processando..." : "Assinar Agora — R$29,90/mês"}
          </Button>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Pagamento seguro via ASAAS</span>
            <button onClick={signOut} className="text-primary hover:underline">
              Sair da conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
