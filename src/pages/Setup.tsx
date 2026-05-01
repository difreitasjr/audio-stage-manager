import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Setup() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    (async () => {
      const { data: exists, error } = await supabase.rpc("admin_exists");
      if (error) {
        toast.error("Erro ao verificar configuração inicial");
        setChecking(false);
        return;
      }
      if (exists === true) {
        toast.info("Já existe um administrador cadastrado. Faça login.");
        navigate("/login", { replace: true });
        return;
      }
      setChecking(false);
    })();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, nome);
      // Tenta login imediato (auto-confirm está ligado)
      try {
        await signIn(email, password);
        toast.success("Administrador criado! Bem-vindo.");
        navigate("/bem-vindo", { replace: true });
      } catch {
        toast.success("Administrador criado! Faça login.");
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar administrador");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <ShieldCheck className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Configuração Inicial</CardTitle>
          <CardDescription>Crie a conta do primeiro administrador</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar Administrador
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
