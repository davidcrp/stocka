import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, XCircle, Clock, Users, ShieldCheck, UserPlus, Mail, Send } from "lucide-react";
import { toast } from "sonner";

type Profile = {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string | null;
  status: string;
  created_at: string;
  phone: string | null;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-500", icon: Clock },
  approved: { label: "Aprovado", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const AdminUsers = () => {
  const { profile: currentProfile } = useAuth();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("vendedor");
  const [inviteLoading, setInviteLoading] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, role, status, created_at, phone")
        .order("created_at", { ascending: false });
      return (data || []) as Profile[];
    },
    staleTime: 10_000,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["invitations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("invitations")
        .select("id, email, role, status, created_at")
        .order("created_at", { ascending: false });
      return (data || []) as Invitation[];
    },
    staleTime: 10_000,
  });

  const updateStatus = async (userId: string, newStatus: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ status: newStatus as any })
      .eq("user_id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(newStatus === "approved" ? "Usuário aprovado!" : "Usuário rejeitado.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !currentProfile?.account_id) return;
    setInviteLoading(true);

    try {
      // Insert invitation
      const { error } = await supabase.from("invitations").insert({
        email: inviteEmail,
        role: inviteRole,
        account_id: currentProfile.account_id,
        invited_by: (await supabase.auth.getUser()).data.user?.id,
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast.error("Já existe um convite pendente para este email.");
        } else {
          toast.error(error.message);
        }
        setInviteLoading(false);
        return;
      }

      // Get account name for the email
      const { data: account } = await supabase
        .from("accounts")
        .select("name")
        .eq("id", currentProfile.account_id)
        .single();

      // Send invite email via Resend
      const signupUrl = `${window.location.origin}/auth?invite=${encodeURIComponent(inviteEmail)}`;
      await supabase.functions.invoke("send-invite-email", {
        body: {
          email: inviteEmail,
          inviterName: currentProfile.full_name,
          dealershipName: account?.name,
          role: inviteRole,
          signupUrl,
        },
      });

      toast.success(`Convite enviado para ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("vendedor");
      setInviteOpen(false);
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar convite.");
    }

    setInviteLoading(false);
  };

  const pendingUsers = users.filter((u) => u.status === "pending");
  const otherUsers = users.filter((u) => u.status !== "pending");
  const pendingInvites = invitations.filter((i) => i.status === "pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" /> Gestão de Usuários
          </h1>
          <p className="text-sm text-muted-foreground">Aprove, rejeite ou convide membros da equipe</p>
        </div>

        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground gap-2">
              <UserPlus className="w-4 h-4" /> Convidar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary" /> Convidar membro
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Cargo</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                O convidado criará a conta e entrará automaticamente na sua equipe — sem precisar de aprovação.
              </p>
              <Button
                className="w-full gap-2"
                onClick={handleInvite}
                disabled={inviteLoading || !inviteEmail}
              >
                <Send className="w-4 h-4" />
                {inviteLoading ? "Enviando..." : "Enviar convite"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pendingUsers.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            Aguardando aprovação ({pendingUsers.length})
          </h2>
          <div className="space-y-3">
            {pendingUsers.map((u) => (
              <Card key={u.id} className="p-4 border-amber-500/20 bg-amber-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{u.full_name || "Sem nome"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Registrado em {new Date(u.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                      onClick={() => updateStatus(u.user_id, "rejected")}
                    >
                      <XCircle className="w-4 h-4 mr-1" /> Rejeitar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary text-primary-foreground"
                      onClick={() => updateStatus(u.user_id, "approved")}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Aprovar
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {pendingUsers.length === 0 && pendingInvites.length === 0 && (
        <Card className="p-8 text-center border-border">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Nenhum usuário pendente</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Convide membros da equipe usando o botão acima</p>
        </Card>
      )}

      {pendingInvites.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            Convites enviados ({pendingInvites.length})
          </h2>
          <div className="space-y-2">
            {pendingInvites.map((inv) => (
              <Card key={inv.id} className="p-4 border-primary/10 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{inv.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                      {inv.role} · Enviado em {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge className="bg-primary/10 text-primary text-xs">
                    <Clock className="w-3 h-3 mr-1" /> Aguardando
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {otherUsers.length > 0 && (
        <section>
          <h2 className="font-display text-lg font-semibold mb-4">Equipe ({otherUsers.length})</h2>
          <div className="space-y-2">
            {otherUsers.map((u) => {
              const cfg = statusConfig[u.status] || statusConfig.pending;
              const StatusIcon = cfg.icon;
              return (
                <Card key={u.id} className="p-4 border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {u.full_name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{u.full_name || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{u.role || "vendedor"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${cfg.color} text-xs`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {cfg.label}
                      </Badge>
                      {u.status === "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => updateStatus(u.user_id, "approved")}>
                          Aprovar
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdminUsers;
