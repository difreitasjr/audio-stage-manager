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
  signUp: (email: string, password: string, nome: string) => Promise<void>;
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
        console.log("✅ Usuário carregado do localStorage:", JSON.parse(savedUser).email);
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
        .eq("password_hash", password);

      if (error) {
        console.error("❌ Erro na query:", error);
        throw new Error("Erro ao fazer login");
      }

      if (!data || data.length === 0) {
        console.error("❌ Usuário não encontrado ou senha incorreta");
        throw new Error("Email ou senha incorretos");
      }

      const appUser = data[0];

      if (!appUser.ativo) {
        console.warn("⚠️ Usuário inativo");
        throw new Error("Usuário inativo");
      }

      const userData: User = {
        id: appUser.id,
        email: appUser.email,
        nome: appUser.nome,
        role: appUser.role,
        ativo: appUser.ativo,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ Login bem-sucedido:", userData.email, "Role:", userData.role);
    } catch (error) {
      console.error("❌ Erro ao fazer login:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      console.log("📝 Tentando cadastro:", email);

      // Inserir novo usuário na tabela app_users
      const { data, error } = await supabase
        .from("app_users")
        .insert([
          {
            email,
            password_hash: password, // ⚠️ IMPORTANTE: usar hash em produção!
            nome,
            role: "staff", // Novos usuários começam como staff
            ativo: true,
          },
        ])
        .select();

      if (error) {
        console.error("❌ Erro no cadastro:", error);
        throw new Error("Erro ao fazer cadastro");
      }

      console.log("✅ Cadastro realizado com sucesso!");
    } catch (error) {
      console.error("❌ Erro ao cadastrar:", error);
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
