import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Cadastro() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [empresaNome, setEmpresaNome] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaNome || !nome || !email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return;
    }
    setLoading(true);
    try {
      await signUp(email, password, nome, empresaNome);
      try {
        await signIn(email, password);
        toast.success(`Empresa "${empresaNome}" criada! Bem-vindo.`);
        navigate("/bem-vindo", { replace: true });
      } catch {
        toast.success("Cadastro realizado! Faça login.");
        navigate("/login", { replace: true });
      }
    } catch (err: any) {
      const msg = err?.message || "Erro ao cadastrar";
      toast.error(msg);
      if (msg.toLowerCase().includes("já está cadastrado")) {
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Cadastrar Nova Empresa</CardTitle>
          <CardDescription>
            Crie sua conta de administrador. Você poderá cadastrar usuários e configurar tudo depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="empresa">Nome da Empresa</Label>
              <Input id="empresa" value={empresaNome} onChange={e => setEmpresaNome(e.target.value)} placeholder="Ex: Produtora ABC" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome">Seu Nome (Administrador)</Label>
              <Input id="nome" value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Criar Empresa e Administrador
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Faça login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
