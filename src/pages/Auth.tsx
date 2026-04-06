import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import icon from "@/assets/icon.png";
import { useToast } from "@/hooks/use-toast";
import { Store, Car, Smartphone, ShoppingBag, Armchair, Wrench } from "lucide-react";

const businessTypes = [
  { value: "dealership", label: "Concessionária", description: "Veículos e automóveis", icon: Car },
  { value: "electronics", label: "Eletrônicos", description: "Celulares, notebooks, etc.", icon: Smartphone },
  { value: "retail", label: "Varejo", description: "Loja de roupas, acessórios", icon: ShoppingBag },
  { value: "furniture", label: "Móveis", description: "Móveis e decoração", icon: Armchair },
  { value: "custom", label: "Personalizado", description: "Configure do zero", icon: Wrench },
];

const Auth = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const inviteEmail = searchParams.get("invite") || "";
  const [isLogin, setIsLogin] = useState(!inviteEmail);
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessType, setBusinessType] = useState("dealership");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("status")
          .eq("user_id", data.user.id)
          .single();

        if (profile?.status === "pending") {
          await supabase.auth.signOut();
          toast({
            title: "Conta pendente",
            description: "Sua conta está aguardando aprovação do administrador.",
            variant: "destructive",
          });
        } else if (profile?.status === "rejected") {
          await supabase.auth.signOut();
          toast({
            title: "Conta rejeitada",
            description: "Sua solicitação de acesso foi negada. Entre em contato com o administrador.",
            variant: "destructive",
          });
        } else {
          navigate("/dashboard");
        }
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, dealership_name: businessName, business_type: businessType },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        // Update account business_type after creation
        if (data.user) {
          // The handle_new_user trigger creates the account, we'll update the type
          setTimeout(async () => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("account_id")
              .eq("user_id", data.user!.id)
              .single();
            if (profile?.account_id) {
              await supabase.from("accounts").update({
                business_type: businessType,
              }).eq("id", profile.account_id);
            }
          }, 2000);
        }

        try {
          const confirmationUrl = `${window.location.origin}/auth?confirmed=true`;
          await supabase.functions.invoke('send-confirmation-email', {
            body: { email, confirmationUrl, fullName },
          });
        } catch (emailError) {
          console.error('Error sending confirmation email:', emailError);
        }
        toast({ title: "Conta criada!", description: "Verifique seu email para confirmar sua conta." });
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <img src={icon} alt="CarROI" className="h-9 w-9" />
          <span className="font-display text-2xl font-bold">CarROI</span>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="font-display text-xl font-semibold mb-1 text-center">
            {isLogin ? "Entrar" : "Criar conta"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? "Acesse seu painel" : "Registre seu negócio"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <Input
                  placeholder="Nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Nome do negócio"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                />

                {/* Business Type Selection */}
                <div>
                  <label className="text-xs text-muted-foreground mb-2 block font-medium">Tipo de negócio</label>
                  <div className="grid grid-cols-2 gap-2">
                    {businessTypes.map((bt) => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => setBusinessType(bt.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                          businessType === bt.value
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-muted-foreground/30"
                        }`}
                      >
                        <bt.icon className={`w-4 h-4 shrink-0 ${businessType === bt.value ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{bt.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{bt.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button
              type="submit"
              className="w-full bg-gradient-profit text-primary-foreground font-semibold shadow-glow hover:opacity-90"
              disabled={loading}
            >
              {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-4">
            {isLogin ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline font-medium"
            >
              {isLogin ? "Cadastre-se" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
