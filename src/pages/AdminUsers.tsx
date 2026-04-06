import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Users, ShieldCheck } from "lucide-react";
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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "bg-amber-500/10 text-amber-500", icon: Clock },
  approved: { label: "Aprovado", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const AdminUsers = () => {
  const { profile: currentProfile } = useAuth();
  const queryClient = useQueryClient();

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

  const pendingUsers = users.filter((u) => u.status === "pending");
  const otherUsers = users.filter((u) => u.status !== "pending");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" /> Gestão de Usuários
        </h1>
        <p className="text-sm text-muted-foreground">Aprove ou rejeite usuários da sua equipe</p>
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

      {pendingUsers.length === 0 && (
        <Card className="p-8 text-center border-border">
          <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
          <p className="font-medium text-muted-foreground">Nenhum usuário pendente</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Novos membros da equipe aparecerão aqui</p>
        </Card>
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
