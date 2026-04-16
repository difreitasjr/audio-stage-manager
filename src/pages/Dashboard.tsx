import { useAuth } from "@/contexts/AuthContext";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useOrdens } from "@/hooks/useOrdens";
import { useSetores } from "@/hooks/useSetores";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ClipboardList, AlertTriangle, CheckCircle, Clock, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusLabels: Record<string, string> = {
  disponivel: "Disponível", em_uso: "Em Uso", danificado: "Danificado", manutencao: "Manutenção",
  aberta: "Aberta", em_andamento: "Em Andamento", retornado: "Retornado", atrasada: "Atrasada",
};

const statusColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-800",
  em_uso: "bg-blue-100 text-blue-800",
  danificado: "bg-red-100 text-red-800",
  manutencao: "bg-yellow-100 text-yellow-800",
  aberta: "bg-blue-100 text-blue-800",
  em_andamento: "bg-yellow-100 text-yellow-800",
  retornado: "bg-green-100 text-green-800",
  atrasada: "bg-red-100 text-red-800",
};

export default function Dashboard() {
  const { isAdmin, profile } = useAuth();
  const { data: equipamentos = [] } = useEquipamentos();
  const { data: ordens = [] } = useOrdens();
  const { data: setores = [] } = useSetores();

  const countByStatus = (status: string) => equipamentos.filter((e: any) => e.status === status).length;
  const countOrdensByStatus = (status: string) => ordens.filter((o: any) => o.status === status).length;

  const cards = [
    { label: "Total Equipamentos", value: equipamentos.length, icon: Package, color: "text-primary" },
    { label: "Disponíveis", value: countByStatus("disponivel"), icon: CheckCircle, color: "text-green-600" },
    { label: "Em Uso", value: countByStatus("em_uso"), icon: Clock, color: "text-blue-600" },
    { label: "Danificados", value: countByStatus("danificado"), icon: AlertTriangle, color: "text-red-600" },
    { label: "Em Manutenção", value: countByStatus("manutencao"), icon: Wrench, color: "text-yellow-600" },
    { label: "Ordens Abertas", value: countOrdensByStatus("aberta") + countOrdensByStatus("em_andamento"), icon: ClipboardList, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {isAdmin ? "Visão Geral" : `Meu Setor`}
        </h2>
        <p className="text-muted-foreground">
          {isAdmin ? "Resumo de todos os setores" : `Bem-vindo, ${profile?.nome}`}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Equipamentos por Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {setores.map((setor: any) => {
                  const count = equipamentos.filter((e: any) => e.setor_id === setor.id).length;
                  const pct = equipamentos.length ? (count / equipamentos.length) * 100 : 0;
                  return (
                    <div key={setor.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{setor.nome}</span>
                        <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ordens Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ordens.slice(0, 5).map((ordem: any) => (
                  <div key={ordem.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">OS #{ordem.numero} - {ordem.cliente}</p>
                      <p className="text-xs text-muted-foreground">{ordem.profiles?.nome}</p>
                    </div>
                    <Badge variant="secondary" className={statusColors[ordem.status]}>
                      {statusLabels[ordem.status]}
                    </Badge>
                  </div>
                ))}
                {ordens.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ordem encontrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Minhas Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ordens.slice(0, 10).map((ordem: any) => (
                <div key={ordem.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">OS #{ordem.numero} - {ordem.cliente}</p>
                    <p className="text-xs text-muted-foreground">{new Date(ordem.data_saida).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant="secondary" className={statusColors[ordem.status]}>
                    {statusLabels[ordem.status]}
                  </Badge>
                </div>
              ))}
              {ordens.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ordem encontrada</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
