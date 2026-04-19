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
  signUp: (email: string, password: string, nome: string) => Promise<{ id: string }>;
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
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        console.log("✅ Usuário carregado:", parsedUser.email);
      } catch (error) {
        console.error("❌ Erro ao carregar:", error);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Login:", email);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, nome, ativo")
        .eq("email", email)
        .single();

      if (error || !data) {
        throw new Error("Email ou senha incorretos");
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.id)
        .single();

      const userData: User = {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: (roleData?.role || "staff") as AppRole,
        ativo: data.ativo,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ Login OK:", userData.role);

      setTimeout(() => {
        navigate(userData.role === "admin" ? "/admin" : "/dashboard", { replace: true });
      }, 100);
    } catch (error) {
      console.error("❌ Erro login:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      console.log("📝 Criando usuário:", email);

      // Verificar se é primeiro admin
      const { data: admins } = await supabase
        .from("user_roles")
        .select("id")
        .eq("role", "admin");

      const isFirstAdmin = !admins || admins.length === 0;

      // Criar usuário no Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome },
        },
      });

      if (error) throw error;

      const userId = data.user!.id;

      // Inserir em profiles
      await supabase.from("profiles").insert({
        id: userId,
        email,
        nome,
        ativo: true,
      });

      // Inserir em user_roles (admin se for primeiro, senão staff)
      await supabase.from("user_roles").insert({
        user_id: userId,
        role: isFirstAdmin ? "admin" : "staff",
      });

      console.log("✅ Usuário criado:", isFirstAdmin ? "ADMIN" : "STAFF");
      return { id: userId };
    } catch (error) {
      console.error("❌ Erro signup:", error);
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
