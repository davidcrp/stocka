import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const sourceLabels: Record<string, string> = {
  olx: "OLX", facebook: "Facebook", whatsapp: "WhatsApp", loja: "Loja",
  instagram: "Instagram", indicacao: "Indicação", outro: "Outro",
};

export type LeadFormData = {
  name: string; phone: string; email: string; source: string; notes: string; proposed_value: number;
};

interface Props {
  form: LeadFormData;
  onChange: (form: LeadFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  isEditing: boolean;
}

export function LeadForm({ form, onChange, onSubmit, submitting, isEditing }: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input placeholder="Nome *" value={form.name} onChange={(e) => onChange({ ...form, name: e.target.value })} required />
      <div className="grid grid-cols-2 gap-3">
        <Input placeholder="Telefone (com DDD)" value={form.phone} onChange={(e) => onChange({ ...form, phone: e.target.value })} />
        <Input type="email" placeholder="Email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Select value={form.source} onValueChange={(v) => onChange({ ...form, source: v })}>
          <SelectTrigger><SelectValue placeholder="Origem" /></SelectTrigger>
          <SelectContent>
            {Object.entries(sourceLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Valor proposto" value={form.proposed_value || ""} onChange={(e) => onChange({ ...form, proposed_value: +e.target.value })} />
      </div>
      <Input placeholder="Observações" value={form.notes} onChange={(e) => onChange({ ...form, notes: e.target.value })} />
      <Button type="submit" className="w-full bg-gradient-profit text-primary-foreground font-semibold" disabled={submitting}>
        {submitting ? "Salvando..." : isEditing ? "Atualizar" : "Salvar"}
      </Button>
    </form>
  );
}
