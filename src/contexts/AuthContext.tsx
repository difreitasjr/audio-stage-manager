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
        console.log("✅ Usuário carregado do localStorage:", parsedUser.email);
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
        .from("profiles")
        .select("id, email, nome, ativo")
        .eq("email", email)
        .single();

      if (error || !data) {
        console.error("❌ Usuário não encontrado");
        throw new Error("Email ou senha incorretos");
      }

      // Buscar role do usuário
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.id)
        .single();

      if (roleError || !roleData) {
        console.error("❌ Role não encontrado");
        throw new Error("Erro ao verificar permissões");
      }

      const userData: User = {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: roleData.role as AppRole,
        ativo: data.ativo,
      };

      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      console.log("✅ Login bem-sucedido:", userData.email, "Role:", userData.role);

      setTimeout(() => {
        if (userData.role === "admin") {
          console.log("🔴 Redirecionando para /admin");
          navigate("/admin", { replace: true });
        } else {
          console.log("🟢 Redirecionando para /dashboard");
          navigate("/dashboard", { replace: true });
        }
      }, 100);
    } catch (error) {
      console.error("❌ Erro ao fazer login:", error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      console.log("📝 Tentando cadastro:", email);

      // Chamar edge function para criar usuário
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            email,
            password,
            nome,
            role: "staff",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Erro ao criar usuário");
      }

      const data = await response.json();
      console.log("✅ Cadastro realizado com sucesso!");
      return data;
    } catch (error) {
      console.error("❌ Erro ao cadastrar:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem("user");
    console.log("👋 Logout realizado");
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
