import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Package, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      // Validação para cadastro
      if (!name || !email || !password) {
        toast.error("Preencha todos os campos");
        return;
      }
      if (password.length < 6) {
        toast.error("Senha deve ter no mínimo 6 caracteres");
        return;
      }
    } else {
      // Validação para login
      if (!email || !password) {
        toast.error("Preencha todos os campos");
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, name);
        toast.success("Cadastro realizado com sucesso! Faça login agora.");
        setIsSignUp(false);
        setEmail("");
        setPassword("");
        setName("");
      } else {
        await signIn(email, password);
        
        // Obter o usuário do localStorage após login
        const savedUser = localStorage.getItem("user");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          console.log("👤 Usuário logado como:", userData.role);
          
          // Redirecionar baseado na role
          if (userData.role === "admin") {
            console.log("🔴 Redirecionando para /admin");
            navigate("/admin");
          } else {
            console.log("🟢 Redirecionando para /dashboard");
            navigate("/dashboard");
          }
        }
        
        toast.success("Login realizado com sucesso!");
      }
    } catch (err: any) {
      toast.error(err.message || (isSignUp ? "Erro ao cadastrar" : "Erro ao fazer login"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">AV Control</CardTitle>
          <CardDescription>Controle de Estoque & Ordens de Serviço</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="Seu nome" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {isSignUp ? "Cadastrar" : "Entrar"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            {isSignUp ? (
              <>
                Já possui conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setEmail("");
                    setPassword("");
                    setName("");
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Faça login aqui
                </button>
              </>
            ) : (
              <>
                Não possui conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setEmail("");
                    setPassword("");
                  }}
                  className="text-primary hover:underline font-semibold"
                >
                  Cadastre-se aqui
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
