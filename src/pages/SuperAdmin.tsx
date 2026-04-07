import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Store, Users, Plus, Save, Search, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";

type UserProfile = {
  id: string;
  user_id: string;
  full_name: string | null;
  role: string | null;
  status: string;
  account_id: string | null;
  is_superadmin: boolean;
  subscription_status: string | null;
  created_at: string;
};

type Account = {
  id: string;
  name: string;
  created_at: string;
};

const statusLabels: Record<string, { label: string; class: string }> = {
  approved: { label: "Ativo", class: "bg-primary/10 text-primary" },
  pending: { label: "Pendente", class: "bg-amber-500/10 text-amber-500" },
  rejected: { label: "Bloqueado", class: "bg-destructive/10 text-destructive" },
};

const SuperAdmin = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [newAccountName, setNewAccountName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingChanges, setPendingChanges] = useState<
    Record<string, { account_id?: string; role?: string }>
  >({});

  const { data: allUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["superadmin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, role, status, account_id, is_superadmin, subscription_status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as UserProfile[];
    },
  });

  const { data: allAccounts = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["superadmin-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, created_at")
        .order("name");
      if (error) throw error;
      return (data || []) as Account[];
    },
  });

  // Check if user is superadmin
  if (profile && !(profile as any).is_superadmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) return;
    setCreating(true);
    const { error } = await supabase.rpc("admin_create_account", {
      _name: newAccountName.trim(),
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Loja "${newAccountName}" criada!`);
      setNewAccountName("");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["superadmin-accounts"] });
    }
    setCreating(false);
  };

  const stageChange = (userId: string, field: "account_id" | "role", value: string) => {
    setPendingChanges((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const saveUserChanges = async (user: UserProfile) => {
    const changes = pendingChanges[user.user_id];
    if (!changes) return;

    const accountId = changes.account_id || user.account_id;
    const role = changes.role || user.role;

    if (!accountId || !role) {
      toast.error("Selecione loja e cargo.");
      return;
    }

    const { error } = await supabase.rpc("admin_update_user", {
      _target_user_id: user.user_id,
      _account_id: accountId,
      _role: role,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`${user.full_name || "Usuário"} atualizado!`);
      setPendingChanges((prev) => {
        const next = { ...prev };
        delete next[user.user_id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
    }
  };

  const toggleSubscription = async (user: UserProfile) => {
    const newStatus = user.subscription_status === "active" ? "inactive" : "active";
    const { error } = await supabase
      .from("profiles")
      .update({ subscription_status: newStatus } as any)
      .eq("user_id", user.user_id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Assinatura de ${user.full_name || "Usuário"} ${newStatus === "active" ? "ativada" : "desativada"}!`);
      queryClient.invalidateQueries({ queryKey: ["superadmin-users"] });
    }
  };

  const getAccountName = (accountId: string | null) => {
    if (!accountId) return "Sem loja";
    return allAccounts.find((a) => a.id === accountId)?.name || "Desconhecida";
  };

  const filteredUsers = allUsers.filter((u) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term) ||
      getAccountName(u.account_id).toLowerCase().includes(term)
    );
  });

  if (loadingUsers || loadingAccounts) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" /> Painel Master
          </h1>
          <p className="text-sm text-muted-foreground">
            {allUsers.length} usuários · {allAccounts.length} lojas
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground gap-2">
              <Plus className="w-4 h-4" /> Nova Loja
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> Criar nova loja
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
                <Input
                  placeholder="Nome do negócio"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                />
              <Button
                className="w-full"
                onClick={handleCreateAccount}
                disabled={creating || !newAccountName.trim()}
              >
                {creating ? "Criando..." : "Criar loja"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Accounts overview */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <Store className="w-5 h-5 text-primary" /> Lojas ({allAccounts.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allAccounts.map((acc) => {
            const userCount = allUsers.filter((u) => u.account_id === acc.id).length;
            return (
              <Card key={acc.id} className="p-4 border-border/50">
                <p className="font-medium text-sm">{acc.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {userCount} membro{userCount !== 1 ? "s" : ""} · Criada em{" "}
                  {new Date(acc.created_at).toLocaleDateString("pt-BR")}
                </p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Users table */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Todos os usuários
          </h2>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-9 h-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card className="border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Loja</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assinatura</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const changes = pendingChanges[u.user_id];
                const hasChanges = !!changes;
                const currentAccountId = changes?.account_id || u.account_id || "";
                const currentRole = changes?.role || u.role || "vendedor";
                const sts = statusLabels[u.status] || statusLabels.pending;

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {u.full_name?.[0]?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1">
                            {u.full_name || "Sem nome"}
                            {u.is_superadmin && (
                              <Crown className="w-3 h-3 text-amber-500" />
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentAccountId}
                        onValueChange={(val) => stageChange(u.user_id, "account_id", val)}
                        disabled={u.is_superadmin}
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
                          <SelectValue placeholder="Selecionar loja" />
                        </SelectTrigger>
                        <SelectContent>
                          {allAccounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentRole}
                        onValueChange={(val) => stageChange(u.user_id, "role", val)}
                        disabled={u.is_superadmin}
                      >
                        <SelectTrigger className="h-8 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="gestor">Gestor</SelectItem>
                          <SelectItem value="vendedor">Vendedor</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${sts.class} text-xs`}>{sts.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {!u.is_superadmin && (
                        <Button
                          size="sm"
                          variant={u.subscription_status === "active" ? "destructive" : "default"}
                          className="h-7 text-xs gap-1"
                          onClick={() => toggleSubscription(u)}
                        >
                          {u.subscription_status === "active" ? (
                            <><ShieldOff className="w-3 h-3" /> Desativar</>
                          ) : (
                            <><ShieldCheck className="w-3 h-3" /> Ativar</>
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasChanges && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => saveUserChanges(u)}
                        >
                          <Save className="w-3 h-3" /> Salvar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </section>
    </div>
  );
};

export default SuperAdmin;
