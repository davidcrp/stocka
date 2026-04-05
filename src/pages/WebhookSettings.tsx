import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/whatsapp-webhook`;

const WebhookSettings = () => {
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold">Configuração do Webhook</h1>
        <p className="text-sm text-muted-foreground">
          Configure serviços externos (Z-API, Evolution API, etc.) para enviar mensagens do WhatsApp automaticamente
        </p>
      </div>

      {/* Endpoint URL */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">URL do Webhook</CardTitle>
          <CardDescription>Use esta URL no seu serviço de WhatsApp como endpoint de webhook</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={WEBHOOK_URL} className="font-mono text-xs bg-muted" />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(WEBHOOK_URL, "URL")}
              className="shrink-0"
            >
              {copied === "URL" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Auth Header */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Autenticação</CardTitle>
          <CardDescription>
            Envie o header <code className="bg-muted px-1.5 py-0.5 rounded text-xs">x-webhook-secret</code> com o valor do secret configurado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-muted rounded-lg p-3 text-xs font-mono space-y-1">
            <p className="text-muted-foreground">Header obrigatório:</p>
            <p>x-webhook-secret: <span className="text-primary">SEU_SECRET</span></p>
          </div>
          <p className="text-xs text-muted-foreground">
            Para alterar o secret, acesse as configurações do backend no Lovable Cloud.
          </p>
        </CardContent>
      </Card>

      {/* Payload Format */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Formato do Payload</CardTitle>
          <CardDescription>Envie um JSON com os seguintes campos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 text-xs font-mono space-y-1 overflow-x-auto">
            <p>{"{"}</p>
            <p className="pl-4"><span className="text-primary">"phone"</span>: <span className="text-muted-foreground">"5511999998888"</span> <span className="text-yellow-500">// obrigatório</span></p>
            <p className="pl-4"><span className="text-primary">"message"</span>: <span className="text-muted-foreground">"Texto da mensagem"</span> <span className="text-yellow-500">// opcional</span></p>
            <p className="pl-4"><span className="text-primary">"name"</span>: <span className="text-muted-foreground">"Nome do contato"</span> <span className="text-yellow-500">// opcional</span></p>
            <p className="pl-4"><span className="text-primary">"direction"</span>: <span className="text-muted-foreground">"inbound" | "outbound"</span> <span className="text-yellow-500">// padrão: inbound</span></p>
            <p>{"}"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Example cURL */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Exemplo cURL</CardTitle>
          <CardDescription>Teste o webhook com este comando</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <pre className="bg-muted rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all">
              {exampleCurl}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(exampleCurl, "cURL")}
            >
              {copied === "cURL" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Como funciona</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
            <li>
              <strong className="text-foreground">Mensagem chega</strong> — o serviço externo envia um POST para o webhook
            </li>
            <li>
              <strong className="text-foreground">Lead criado/atualizado</strong> — se o telefone não existe, cria um novo lead com status "Novo" e source "WhatsApp". Se já existe, atualiza o último contato.
            </li>
            <li>
              <strong className="text-foreground">Atribuição automática</strong> — novos leads são atribuídos ao vendedor com menos leads (round-robin)
            </li>
            <li>
              <strong className="text-foreground">Atualização em tempo real</strong> — o lead aparece instantaneamente na Central de Leads com notificação
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Compatible services */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">Serviços compatíveis</CardTitle>
          <CardDescription>Qualquer serviço que envie webhooks HTTP funciona</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {["Z-API", "Evolution API", "WPPConnect", "Baileys Server", "Twilio", "Meta Cloud API"].map((s) => (
              <div key={s} className="bg-muted rounded-lg px-3 py-2 text-xs font-medium text-center">
                {s}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookSettings;
