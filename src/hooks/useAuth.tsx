import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  isApproved: boolean;
  isLoading: boolean;
  employeeCode: string | null;
  delegacion: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  isApproved: false,
  isLoading: true,
  employeeCode: null,
  delegacion: null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeCode, setEmployeeCode] = useState<string | null>(null);
  const [delegacion, setDelegacion] = useState<string | null>(null);

  const fetchUserData = async (userId: string) => {
    try {
      if (import.meta.env.DEV) console.log("[Auth] Fetching user data for:", userId);
      
      const [profileRes, roleRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("is_approved, employee_code, delegacion")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (import.meta.env.DEV) console.log("[Auth] Profile result:", JSON.stringify(profileRes));
      if (import.meta.env.DEV) console.log("[Auth] Role result:", JSON.stringify(roleRes));

      if (profileRes.error) {
        console.error("[Auth] Error fetching profile:", profileRes.error);
        setIsApproved(false);
        setEmployeeCode(null);
        setDelegacion(null);
      } else {
        setIsApproved(profileRes.data?.is_approved ?? false);
        setEmployeeCode(profileRes.data?.employee_code ?? null);
        setDelegacion(profileRes.data?.delegacion ?? null);
      }

      if (roleRes.error) {
        console.error("[Auth] Error fetching role:", roleRes.error);
        setRole(null);
      } else {
        setRole((roleRes.data?.role as AppRole) ?? null);
      }
    } catch (err) {
      console.error("[Auth] Error fetching user data:", err);
      setIsApproved(false);
      setRole(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // Get initial session first
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      console.log("[Auth] Initial session:", session?.user?.id ?? "none");
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      if (mounted) setIsLoading(false);
    }).catch(() => {
      if (mounted) setIsLoading(false);
    });

    // Then listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        console.log("[Auth] Auth state change:", _event, session?.user?.id ?? "none");
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          // Defer Supabase calls to avoid deadlock inside onAuthStateChange
          setTimeout(async () => {
            if (!mounted) return;
            await fetchUserData(session.user.id);
            if (mounted) setIsLoading(false);
          }, 0);
        } else {
          setRole(null);
          setIsApproved(false);
          setIsLoading(false);
        }
      }
    );

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) setIsLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const signOut = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Sign out timeout")), 4000)),
      ]);
    } catch (err) {
      console.error("Error during sign out:", err);
    } finally {
      setSession(null);
      setUser(null);
      setRole(null);
      setIsApproved(false);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, isApproved, isLoading, employeeCode, delegacion, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
