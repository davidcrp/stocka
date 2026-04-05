import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MessageCircle, Send, Phone, Mail, Pencil, Trash2, Clock, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow, differenceInHours, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Lead } from "./types";
import { LeadTimeline } from "./LeadTimeline";

const statusColors: Record<string, string> = {
  novo: "bg-accent/10 text-accent border-accent/20",
  contactado: "bg-primary/10 text-primary border-primary/20",
  aguardando: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  negociando: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  fechado: "bg-primary/10 text-primary border-primary/20",
  perdido: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusLabels: Record<string, string> = {
  novo: "Novo", contactado: "Contactado", aguardando: "Aguardando",
  negociando: "Negociando", fechado: "Fechado", perdido: "Perdido",
};

const sourceLabels: Record<string, string> = {
  olx: "OLX", facebook: "Facebook", whatsapp: "WhatsApp", loja: "Loja",
  instagram: "Instagram", indicacao: "Indicação", outro: "Outro",
};

type UrgencyLevel = "urgent" | "waiting" | "active" | "cold" | "closed";

function getUrgency(lead: Lead): UrgencyLevel {
  if (lead.status === "fechado" || lead.status === "perdido") return "closed";
  const now = new Date();
  const lastAction = lead.last_contact_at ? new Date(lead.last_contact_at) : new Date(lead.created_at);
  const hoursIdle = differenceInHours(now, lastAction);
  const daysIdle = differenceInDays(now, lastAction);

  if (lead.status === "novo" && hoursIdle >= 2) return "urgent";
  if (daysIdle >= 3) return "cold";
  if (hoursIdle >= 24) return "waiting";
  return "active";
}

const urgencyConfig: Record<UrgencyLevel, { label: string; color: string; icon: typeof AlertTriangle; message: string }> = {
  urgent: { label: "URGENTE", color: "bg-red-500/20 text-red-400 border-red-500/30 animate-pulse", icon: AlertTriangle, message: "Você está perdendo este lead!" },
  waiting: { label: "AGUARDANDO", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Clock, message: "Envie um follow-up agora" },
  cold: { label: "FRIO", color: "bg-blue-400/20 text-blue-300 border-blue-400/30", icon: Clock, message: "Sem atividade há 3+ dias" },
  active: { label: "ATIVO", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle2, message: "" },
  closed: { label: "", color: "", icon: CheckCircle2, message: "" },
};

interface LeadCardProps {
  lead: Lead;
  onWhatsApp: (lead: Lead, type: "contact" | "followup") => void;
  onStatusChange: (id: string, status: string) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (id: string) => void;
  interactions: Array<{ action_type: string; message: string | null; created_at: string }>;
}

export function LeadCard({ lead, onWhatsApp, onStatusChange, onEdit, onDelete, interactions }: LeadCardProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const urgency = getUrgency(lead);
  const urg = urgencyConfig[urgency];
  const isClosed = lead.status === "fechado" || lead.status === "perdido";

  return (
    <Card className={`p-4 bg-card border-border hover:border-primary/20 transition-all ${isClosed ? "opacity-60" : ""}`}>
      {/* Urgency Alert */}
      {urgency !== "active" && urgency !== "closed" && (
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-3 text-xs font-semibold border ${urg.color}`}>
          <urg.icon className="w-3.5 h-3.5" />
          <span>{urg.label}</span>
          <span className="font-normal opacity-80">— {urg.message}</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        {/* Left: Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-semibold truncate">{lead.name}</h3>
            <Badge className={statusColors[lead.status || "novo"]}>{statusLabels[lead.status || "novo"]}</Badge>
            {urgency === "active" && !isClosed && (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">ATIVO</Badge>
            )}
            {lead.source && <Badge variant="outline" className="text-xs">{sourceLabels[lead.source] || lead.source}</Badge>}
            {(lead.follow_up_count ?? 0) > 0 && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {lead.follow_up_count} follow-up{(lead.follow_up_count ?? 0) > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
            {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{lead.email}</span>}
            <span>Criado {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}</span>
            {lead.last_contact_at && (
              <span className="text-primary/70">Último contato {formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true, locale: ptBR })}</span>
            )}
          </div>

          {lead.notes && <p className="text-sm text-muted-foreground mt-1 truncate">{lead.notes}</p>}
          {lead.proposed_value && lead.proposed_value > 0 && (
            <p className="text-sm font-medium text-primary mt-1">
              R$ {lead.proposed_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex flex-col gap-2 shrink-0">
          {/* WhatsApp Buttons */}
          {lead.phone && !isClosed && (
            <div className="flex gap-1.5">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs gap-1.5"
                onClick={() => onWhatsApp(lead, "contact")}
              >
                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/10 h-8 text-xs gap-1.5"
                onClick={() => onWhatsApp(lead, "followup")}
              >
                <Send className="w-3.5 h-3.5" /> Follow-up
              </Button>
            </div>
          )}

          {/* Quick status actions */}
          <div className="flex gap-1.5">
            {!isClosed && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-primary hover:text-primary gap-1"
                  onClick={() => onStatusChange(lead.id, "fechado")}>
                  <CheckCircle2 className="w-3 h-3" /> Fechar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                  onClick={() => onStatusChange(lead.id, "perdido")}>
                  <XCircle className="w-3 h-3" /> Perder
                </Button>
              </>
            )}
          </div>

          {/* Utility actions */}
          <div className="flex items-center gap-1">
            <Select value={lead.status || "novo"} onValueChange={(v) => onStatusChange(lead.id, v)}>
              <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowTimeline(!showTimeline)}>
              <Clock className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => onEdit(lead)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                  <AlertDialogDescription>O lead {lead.name} será removido permanentemente.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(lead.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>

      {/* Timeline */}
      {showTimeline && <LeadTimeline interactions={interactions} createdAt={lead.created_at} />}
    </Card>
  );
}
