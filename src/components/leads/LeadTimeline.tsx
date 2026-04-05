import { MessageCircle, Send, RefreshCw, StickyNote } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const actionIcons: Record<string, typeof MessageCircle> = {
  whatsapp_contact: MessageCircle,
  whatsapp_followup: Send,
  whatsapp_inbound: MessageCircle,
  whatsapp_outbound: Send,
  status_change: RefreshCw,
  note: StickyNote,
};

const actionLabels: Record<string, string> = {
  whatsapp_contact: "Contato via WhatsApp",
  whatsapp_followup: "Follow-up enviado",
  whatsapp_inbound: "Mensagem recebida (WhatsApp)",
  whatsapp_outbound: "Mensagem enviada (WhatsApp)",
  status_change: "Status alterado",
  note: "Nota adicionada",
};

interface Props {
  interactions: Array<{ action_type: string; message: string | null; created_at: string }>;
  createdAt: string;
}

export function LeadTimeline({ interactions, createdAt }: Props) {
  const items = [
    ...interactions,
    { action_type: "created", message: null, created_at: createdAt },
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de atividades</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma atividade registrada</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {items.map((item, i) => {
            const Icon = actionIcons[item.action_type] || StickyNote;
            const label = item.action_type === "created" ? "Lead criado" : (actionLabels[item.action_type] || item.action_type);
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-3 h-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium">{label}</span>
                  {item.message && <p className="text-muted-foreground truncate">{item.message}</p>}
                </div>
                <span className="text-muted-foreground shrink-0">
                  {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
