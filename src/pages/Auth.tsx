import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
      } else {
        navigate("/dashboard");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        // Send branded confirmation email via Resend
        const confirmationUrl = `${window.location.origin}/auth?confirmed=true`;
        try {
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
          <div className="w-10 h-10 rounded-xl bg-gradient-profit flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold">DealPulse</span>
        </div>

        <div className="p-6 rounded-xl border border-border bg-card">
          <h2 className="font-display text-xl font-semibold mb-1 text-center">
            {isLogin ? "Entrar" : "Criar conta"}
          </h2>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {isLogin ? "Acesse seu painel" : "Comece a vender mais"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                placeholder="Nome completo"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
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
