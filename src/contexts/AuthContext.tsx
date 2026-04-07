import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type ProfileData = {
  full_name: string | null;
  role: string | null;
  avatar_url: string | null;
  account_id: string | null;
  status: string | null;
  is_superadmin: boolean;
  subscription_status: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileData | null;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  profile: null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const initialized = useRef(false);
  const currentUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role, avatar_url, account_id, status, is_superadmin, subscription_status")
      .eq("user_id", userId)
      .single();
    if (data) setProfile(data as ProfileData);
  }, []);

  // Re-fetch profile on window focus to catch subscription changes server-side
  useEffect(() => {
    const handleFocus = () => {
      if (currentUserId.current) {
        fetchProfile(currentUserId.current);
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialized.current) {
        initialized.current = true;
        setSession(session);
        setUser(session?.user ?? null);
        currentUserId.current = session?.user?.id ?? null;
        if (session?.user) fetchProfile(session.user.id);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      currentUserId.current = session?.user?.id ?? null;
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      if (initialized.current) {
        // Already past initial load
      } else {
        initialized.current = true;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (currentUserId.current) {
      await fetchProfile(currentUserId.current);
    }
  }, [fetchProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
