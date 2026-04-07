import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TrialState = {
  status: "trial" | "active" | "inactive" | "overdue" | null;
  trialEndsAt: Date | null;
  remaining: number; // seconds remaining
  minutes: number;
  seconds: number;
  formatted: string; // "09:42"
  isUrgent: boolean; // < 3 min
  isCritical: boolean; // < 2 min
  isExpired: boolean;
  isLoading: boolean;
};

export const useTrialCountdown = (): TrialState => {
  const { data: subData, isLoading } = useQuery({
    queryKey: ["my-subscription-data"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("subscriptions")
        .select("status, trial_ends_at")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (subData?.status !== "trial" || !subData.trial_ends_at) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [subData?.status, subData?.trial_ends_at]);

  const trialEndsAt = subData?.trial_ends_at ? new Date(subData.trial_ends_at) : null;
  const remaining = trialEndsAt ? Math.max(0, Math.floor((trialEndsAt.getTime() - now) / 1000)) : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return {
    status: (subData?.status as TrialState["status"]) ?? null,
    trialEndsAt,
    remaining,
    minutes,
    seconds,
    formatted,
    isUrgent: remaining > 0 && remaining <= 180,
    isCritical: remaining > 0 && remaining <= 120,
    isExpired: subData?.status === "trial" && !!trialEndsAt && remaining <= 0,
    isLoading,
  };
};
