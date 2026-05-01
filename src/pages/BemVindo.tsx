import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Package, ClipboardList, ClipboardCheck, RotateCcw, Wrench, BarChart3, Users, ArrowRight, Sparkles } from "lucide-react";

const features = [
  { icon: Package, title: "Equipamentos", desc: "Cadastre e organize seu estoque por setor.", to: "/equipamentos" },
  { icon: ClipboardList, title: "Ordens de Serviço", desc: "Crie OS, vincule equipamentos e acompanhe o status.", to: "/ordens" },
  { icon: ClipboardCheck, title: "Conferências", desc: "Confira a chegada dos equipamentos no evento.", to: "/conferencias" },
  { icon: RotateCcw, title: "Retornos", desc: "Confira item-a-item ao voltar para o estoque.", to: "/retornos" },
  { icon: Wrench, title: "Manutenção", desc: "Registre reparos e revisões dos equipamentos.", to: "/manutencao" },
  { icon: BarChart3, title: "Relatórios", desc: "Histórico, KPIs e exportação CSV.", to: "/relatorios", adminOnly: true },
  { icon: Users, title: "Usuários", desc: "Gerencie staff e permissões por setor.", to: "/usuarios", adminOnly: true },
];

export default function BemVindo() {
  const navigate = useNavigate();
  const { profile, isAdmin, user } = useAuth();

  const finish = () => {
    if (user?.id) {
      try {
        localStorage.setItem(`welcome_seen_${user.id}`, "1");
      } catch {}
    }
    navigate("/dashboard", { replace: true });
  };

  const visible = features.filter((f) => !f.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 mt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Bem-vindo ao AV Control
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Olá, {profile?.nome?.split(" ")[0] || "tudo certo"}! 👋
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
            Tudo pronto para você gerenciar estoque, ordens de serviço e conferências do seu setor audiovisual.
            {isAdmin && " Como administrador, você tem acesso total ao sistema."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {visible.map((f) => (
            <Card
              key={f.to}
              className="cursor-pointer hover:shadow-lg hover:border-primary/40 transition-all group"
              onClick={() => {
                if (user?.id) {
                  try { localStorage.setItem(`welcome_seen_${user.id}`, "1"); } catch {}
                }
                navigate(f.to);
              }}
            >
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" onClick={finish} className="w-full sm:w-auto">
            Começar agora
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button size="lg" variant="ghost" onClick={finish} className="w-full sm:w-auto">
            Pular
          </Button>
        </div>
      </div>
    </div>
  );
}
