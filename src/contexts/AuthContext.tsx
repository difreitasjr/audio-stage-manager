import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Carregar usuário do localStorage
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("❌ Erro ao carregar usuário:", error);
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log("🔐 Tentando login:", email);

      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .eq("email", email)
        .eq("password_hash", password)
        .single();

      if (error) {
        console.error("❌ Erro na query:", error);
        throw new Error("Email ou senha incorretos");
      }

      if (!data) {
        throw new Error("Usuário não encontrado");
      }

      if (!data.ativo) {
        throw new Error("Usuário inativo");
      }

      const userData: User = {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
        ativo: data.ativo,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ Login bem-sucedido:", userData.email);
    } catch (error) {
      console.error("❌ Erro ao fazer login:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("user");
    console.log("👋 Logout realizado");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: user?.role === "admin",
        loading,
        signIn,
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
