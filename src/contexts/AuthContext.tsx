import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "staff";

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  setor_id: string | null;
  ativo: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    try {
      console.log("🔍 Buscando dados do usuário:", userId);
      
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      ]);

      console.log("📋 Profile Response:", profileRes);
      console.log("👤 Role Response:", roleRes);

      if (profileRes.data) {
        console.log("✅ Profile encontrado:", profileRes.data);
        setProfile(profileRes.data as Profile);
      } else {
        console.warn("⚠️ Profile não encontrado");
      }

      if (roleRes.data) {
        console.log("✅ Role encontrado:", roleRes.data.role);
        setRole(roleRes.data.role as AppRole);
      } else {
        console.warn("⚠️ Role não encontrado");
      }

      if (profileRes.error) {
        console.error("❌ Erro ao buscar profile:", profileRes.error);
      }
      if (roleRes.error) {
        console.error("❌ Erro ao buscar role:", roleRes.error);
      }
    } catch (error) {
      console.error("❌ Erro ao buscar dados do usuário:", error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log("🔄 Auth state changed:", _event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setProfile(null);
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("📌 Initial session:", session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) throw new Error("Usuário não foi criado");

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          user_id: authData.user.id,
          nome: nome,
          setor_id: null,
          ativo: true,
        },
      ]);

      if (profileError) throw profileError;

      const { error: roleError } = await supabase.from("user_roles").insert([
        {
          user_id: authData.user.id,
          role: "staff",
        },
      ]);

      if (roleError) throw roleError;
    } catch (error: any) {
      throw new Error(error.message || "Erro ao cadastrar usuário");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        role,
        isAdmin: role === "admin",
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
