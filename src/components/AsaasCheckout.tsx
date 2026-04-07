import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap, CreditCard, ArrowLeft, Clock, RefreshCw } from "lucide-react";

type AsaasCheckoutProps = {
  onSuccess?: () => void;
  onBack?: () => void;
};

const AsaasCheckout = ({ onSuccess, onBack }: AsaasCheckoutProps) => {
  const { profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<"form" | "payment" | "waiting">("form");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [name, setName] = useState(profile?.full_name || "");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [phone, setPhone] = useState("");

  // Check if user already has a pending subscription (created but not paid)
  useEffect(() => {
    const checkExisting = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sub?.asaas_subscription_id && sub.status === "inactive") {
        setStep("waiting");
      }
    };
    checkExisting();
  }, []);

  const formatCpfCnpj = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return digits
      .replace(/(\d{2})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1/$2")
      .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleSubmit = async () => {
    const cleanCpf = cpfCnpj.replace(/\D/g, "");
    if (!name.trim()) {
      toast.error("Preencha o nome completo");
      return;
    }
    if (cleanCpf.length !== 11 && cleanCpf.length !== 14) {
      toast.error("CPF deve ter 11 dígitos ou CNPJ 14 dígitos");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const res = await supabase.functions.invoke("asaas-create-subscription", {
        body: { name: name.trim(), cpfCnpj: cleanCpf, phone: phone.replace(/\D/g, "") },
      });

      if (res.error) throw new Error(res.error.message || "Erro ao criar assinatura");

      const data = res.data;
      if (!data?.success) throw new Error(data?.error || "Erro ao criar assinatura");

      if (data.invoiceUrl) {
        setPaymentUrl(data.invoiceUrl);
        // Open payment in new tab since ASAAS blocks iframes
        window.open(data.invoiceUrl, "_blank");
        setStep("waiting");
        toast.success("Assinatura criada! Realize o pagamento na aba que foi aberta.");
      } else {
        setStep("waiting");
        toast.info("Assinatura criada! Aguardando confirmação de pagamento.");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Erro ao processar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    setChecking(true);
    try {
      await refreshProfile();
      // Re-check profile status
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: freshProfile } = await supabase
        .from("profiles")
        .select("subscription_status")
        .eq("user_id", user.id)
        .single();

      if (freshProfile?.subscription_status === "active") {
        toast.success("Pagamento confirmado! Bem-vindo ao Plano Pro!");
        onSuccess?.();
      } else {
        toast.info("Pagamento ainda não confirmado. Aguarde alguns instantes.");
      }
    } catch (e) {
      toast.error("Erro ao verificar. Tente novamente.");
    } finally {
      setChecking(false);
    }
  };

  // Waiting for payment confirmation state
  if (step === "waiting") {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border-2 border-amber-500/40 bg-amber-500/5 p-6 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
            <Clock className="w-7 h-7 text-amber-500" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-amber-400">Aguardando Pagamento</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Sua assinatura foi criada. Realize o pagamento para liberar o acesso completo à plataforma.
            </p>
          </div>
        </div>

        <Button
          className="w-full h-12 text-base font-semibold gap-2"
          onClick={handleCheckPayment}
          disabled={checking}
        >
          {checking ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <RefreshCw className="w-5 h-5" />
          )}
          {checking ? "Verificando..." : "Verificar Pagamento"}
        </Button>

        <Button
          variant="outline"
          className="w-full h-11 gap-2"
          onClick={() => setStep("form")}
        >
          <CreditCard className="w-4 h-4" />
          Gerar novo link de pagamento
        </Button>

        <p className="text-xs text-center text-muted-foreground">
          O acesso será liberado automaticamente após a confirmação do pagamento pelo ASAAS.
        </p>
      </div>
    );
  }

  // This step is no longer used since we go directly to "waiting"
  // Kept as fallback - opens payment in new tab

  // Form state
  return (
    <div className="space-y-5">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="checkout-name">Nome completo</Label>
          <Input
            id="checkout-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome completo"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-cpf">CPF ou CNPJ</Label>
          <Input
            id="checkout-cpf"
            value={cpfCnpj}
            onChange={(e) => setCpfCnpj(formatCpfCnpj(e.target.value))}
            placeholder="000.000.000-00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="checkout-phone">Telefone (opcional)</Label>
          <Input
            id="checkout-phone"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>

      <Button
        className="w-full h-12 text-base font-semibold gap-2"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Zap className="w-5 h-5" />
        )}
        {loading ? "Processando..." : "Ativar Agora — R$29,90/mês"}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Pagamento seguro via ASAAS • Cobrança mensal de R$29,90
      </p>
    </div>
  );
};

export default AsaasCheckout;
