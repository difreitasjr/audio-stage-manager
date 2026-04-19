import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "staff";

interface User {
  id: string;
  email: string;
  nome: string;
  role: AppRole;
  ativo: boolean;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, nome: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const userId = authData.user!.id;

      // Verificar se é primeiro admin
      const { data: adminCount } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true });

      const isFirstAdmin = !adminCount || adminCount.length === 0;
      const role = isFirstAdmin ? "admin" : "staff";

      // Inserir em profiles
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({ id: userId, email, nome, ativo: true });

      if (profileError) throw profileError;

      // Inserir em user_roles
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (roleError) throw roleError;

      console.log("✅ Admin criado:", email, "Role:", role);
    } catch (error) {
      console.error("❌ Erro ao criar:", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Buscar usuário em profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, nome, ativo")
        .eq("email", email)
        .single();

      if (profileError || !profile) {
        throw new Error("Usuário não encontrado");
      }

      if (!profile.ativo) {
        throw new Error("Usuário inativo");
      }

      // Buscar role
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", profile.id)
        .single();

      if (roleError || !roleData) {
        throw new Error("Erro ao verificar permissões");
      }

      const userData: User = {
        id: profile.id,
        email,
        nome: profile.nome,
        role: roleData.role as AppRole,
        ativo: profile.ativo,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ Login OK:", userData.role);

      setTimeout(() => {
        navigate(userData.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }, 100);
    } catch (error) {
      console.error("❌ Erro ao fazer login:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
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
