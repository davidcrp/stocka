import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTrialCountdown } from "@/hooks/useTrialCountdown";
import { useAuth } from "@/contexts/AuthContext";
import { Timer, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TrialBanner = () => {
  const trial = useTrialCountdown();
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);

  // Show urgency modal when < 2 min
  useEffect(() => {
    if (trial.isCritical && !modalDismissed) {
      setShowModal(true);
    }
  }, [trial.isCritical, modalDismissed]);

  // Auto-redirect when expired
  useEffect(() => {
    if (trial.isExpired) {
      refreshProfile();
      navigate("/assinatura", { replace: true });
    }
  }, [trial.isExpired, refreshProfile, navigate]);

  // Don't show for superadmins, active users, or non-trial
  if (profile?.is_superadmin) return null;
  if (trial.status === "active") return null;
  if (trial.status !== "trial" && trial.status !== "overdue") return null;
  if (trial.isExpired) return null;

  return (
    <>
      {/* Sticky top banner */}
      <div className={`w-full px-4 py-2.5 flex items-center justify-between gap-3 transition-colors duration-300 ${
        trial.isUrgent
          ? "bg-destructive/10 border-b border-destructive/20"
          : trial.status === "overdue"
            ? "bg-destructive/10 border-b border-destructive/20"
            : "bg-amber-500/10 border-b border-amber-500/20"
      }`}>
        <div className="flex items-center gap-2.5">
          <Timer className={`w-4 h-4 shrink-0 ${
            trial.isUrgent || trial.status === "overdue" ? "text-destructive" : "text-amber-500"
          }`} />
          <span className={`text-xs sm:text-sm font-medium ${
            trial.isUrgent || trial.status === "overdue" ? "text-destructive" : "text-amber-500"
          }`}>
            {trial.status === "overdue"
              ? "Pagamento em atraso — regularize agora"
              : `Teste gratuito: ${trial.formatted} restantes`}
          </span>
        </div>
        <Button
          size="sm"
          variant={trial.isUrgent ? "destructive" : "default"}
          className="h-7 text-xs gap-1 shrink-0"
          onClick={() => navigate("/assinatura")}
        >
          <Zap className="w-3 h-3" />
          Assinar
        </Button>
      </div>

      {/* Urgency modal at < 2 min */}
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) setModalDismissed(true);
        setShowModal(open);
      }}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <Timer className="w-8 h-8 text-destructive" />
              </div>
              <span>Seu acesso será bloqueado!</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="font-mono text-4xl font-black text-destructive animate-pulse">
              {trial.formatted}
            </div>
            <p className="text-sm text-muted-foreground">
              Seu período de teste está acabando. Após o término, todas as funcionalidades serão bloqueadas.
            </p>
            <Button
              className="w-full h-11 text-base font-semibold bg-destructive hover:bg-destructive/90"
              onClick={() => {
                setShowModal(false);
                navigate("/assinatura");
              }}
            >
              <Zap className="w-5 h-5 mr-2" />
              Assinar Agora — R$29,90/mês
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrialBanner;
