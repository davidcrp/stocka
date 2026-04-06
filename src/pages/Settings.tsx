import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, CheckCircle2, Palette, Sun, Moon, LogOut } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

const presetColors = [
  { label: "Verde", hsl: "142 71% 45%" },
  { label: "Azul", hsl: "217 91% 60%" },
  { label: "Roxo", hsl: "262 83% 58%" },
  { label: "Rosa", hsl: "330 81% 60%" },
  { label: "Laranja", hsl: "25 95% 53%" },
  { label: "Vermelho", hsl: "0 72% 51%" },
  { label: "Ciano", hsl: "186 94% 42%" },
  { label: "Amarelo", hsl: "48 96% 53%" },
];

const accentPresets = [
  { label: "Âmbar", hsl: "38 92% 50%" },
  { label: "Azul", hsl: "217 91% 60%" },
  { label: "Rosa", hsl: "330 81% 60%" },
  { label: "Verde", hsl: "142 71% 45%" },
  { label: "Roxo", hsl: "262 83% 58%" },
];

const Settings = () => {
  const { mode, colors, setMode, setColors } = useTheme();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copiado!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const exampleCurl = `curl -X POST "${WEBHOOK_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: SEU_SECRET_AQUI" \\
  -d '{
    "phone": "5511999998888",
    "message": "Quero ver o Civic 2024",
    "name": "João Silva",
    "direction": "inbound"
  }'`;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize o sistema e configure integrações</p>
      </div>

      {/* Theme Section */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" /> Aparência
        </h2>

        {/* Light/Dark Toggle */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Modo de Tema</CardTitle>
            <CardDescription>Escolha entre modo claro e escuro</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <button onClick={() => setMode("light")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 border-2 transition-all ${mode === "light" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <Sun className="w-5 h-5" />
                <span className="font-medium text-sm">Claro</span>
              </button>
              <button onClick={() => setMode("dark")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl p-4 border-2 transition-all ${mode === "dark" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}>
                <Moon className="w-5 h-5" />
                <span className="font-medium text-sm">Escuro</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Primary Color */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Cor Principal</CardTitle>
            <CardDescription>Botões, links e destaques</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-2">
              {presetColors.map((c) => (
                <button key={c.hsl} onClick={() => setColors({ ...colors, primary: c.hsl })}
                  className={`flex items-center gap-2 rounded-lg p-2.5 border-2 transition-all ${colors.primary === c.hsl ? "border-foreground" : "border-border hover:border-muted-foreground/30"}`}>
                  <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ background: `hsl(${c.hsl})` }} />
                  <span className="text-xs font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Accent Color */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Cor de Destaque</CardTitle>
            <CardDescription>Badges, alertas e ícones de destaque</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {accentPresets.map((c) => (
                <button key={c.hsl} onClick={() => setColors({ ...colors, accent: c.hsl })}
                  className={`flex flex-col items-center gap-1.5 rounded-lg p-3 border-2 transition-all ${colors.accent === c.hsl ? "border-foreground" : "border-border hover:border-muted-foreground/30"}`}>
                  <div className="w-6 h-6 rounded-full" style={{ background: `hsl(${c.hsl})` }} />
                  <span className="text-[10px] font-medium">{c.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Prévia</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Button className="bg-gradient-profit text-primary-foreground font-semibold">Botão Principal</Button>
              <Button variant="outline">Secundário</Button>
              <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: `hsl(${colors.accent} / 0.15)`, color: `hsl(${colors.accent})` }}>
                Destaque
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhook Section */}
      <div className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Integração WhatsApp</h2>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">URL do Webhook</CardTitle>
            <CardDescription>Use esta URL no seu serviço de WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs" />
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(WEBHOOK_URL, "URL")} className="shrink-0">
                {copied === "URL" ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Autenticação</CardTitle>
            <CardDescription>
              Envie o header <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x-webhook-secret</code> com o secret configurado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-3 text-xs font-mono space-y-1">
              <p className="text-muted-foreground">Header obrigatório:</p>
              <p>x-webhook-secret: <span className="text-primary">SEU_SECRET</span></p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Formato do Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-lg p-4 text-xs font-mono space-y-1 overflow-x-auto">
              <p>{"{"}</p>
              <p className="pl-4"><span className="text-primary">"phone"</span>: <span className="text-muted-foreground">"5511999998888"</span></p>
              <p className="pl-4"><span className="text-primary">"message"</span>: <span className="text-muted-foreground">"Texto"</span></p>
              <p className="pl-4"><span className="text-primary">"name"</span>: <span className="text-muted-foreground">"Nome"</span></p>
              <p className="pl-4"><span className="text-primary">"direction"</span>: <span className="text-muted-foreground">"inbound"</span></p>
              <p>{"}"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Exemplo cURL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">{exampleCurl}</pre>
              <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={() => copyToClipboard(exampleCurl, "cURL")}>
                {copied === "cURL" ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
