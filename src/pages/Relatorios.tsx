import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useOrdens } from "@/hooks/useOrdens";
import { useSetores } from "@/hooks/useSetores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const statusLabels: Record<string, string> = {
  disponivel: "Disponível", em_uso: "Em Uso", danificado: "Danificado", manutencao: "Manutenção",
  aberta: "Aberta", em_andamento: "Em Andamento", retornado: "Retornado", atrasada: "Atrasada",
};

export default function Relatorios() {
  const { data: equipamentos = [] } = useEquipamentos();
  const { data: ordens = [] } = useOrdens();
  const { data: setores = [] } = useSetores();
  const { data: manutencoes = [] } = useQuery({
    queryKey: ["manutencoes"],
    queryFn: async () => {
      const { data } = await supabase.from("manutencao").select("*, equipamentos(nome)").order("data_inicio", { ascending: false });
      return data || [];
    },
  });

  const exportCSV = (name: string, headers: string[], rows: string[][]) => {
    const escape = (v: any) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${name}.csv`; a.click();
  };

  const equipPorSetor = setores.map((s: any) => ({
    setor: s.nome,
    total: equipamentos.filter((e: any) => e.setor_id === s.id).length,
    disponivel: equipamentos.filter((e: any) => e.setor_id === s.id && e.status === "disponivel").length,
    em_uso: equipamentos.filter((e: any) => e.setor_id === s.id && e.status === "em_uso").length,
    danificado: equipamentos.filter((e: any) => e.setor_id === s.id && e.status === "danificado").length,
    manutencao: equipamentos.filter((e: any) => e.setor_id === s.id && e.status === "manutencao").length,
  }));

  const ordensAbertas = ordens.filter((o: any) => o.status === "aberta" || o.status === "em_andamento");
  const ordensAtrasadas = ordens.filter((o: any) => {
    if (o.status === "retornado") return false;
    return new Date(o.data_retorno_prevista) < new Date();
  });

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Relatórios</h2>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Equipamentos por Setor</CardTitle>
          <Button variant="outline" size="sm" onClick={() => exportCSV("equip-setor", ["Setor","Total","Disponível","Em Uso","Danificado","Manutenção"], equipPorSetor.map(e => [e.setor, String(e.total), String(e.disponivel), String(e.em_uso), String(e.danificado), String(e.manutencao)]))}>
            <Download className="w-4 h-4 mr-1" />CSV
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead><TableHead>Total</TableHead><TableHead>Disponível</TableHead>
                <TableHead>Em Uso</TableHead><TableHead>Danificado</TableHead><TableHead>Manutenção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipPorSetor.map(e => (
                <TableRow key={e.setor}>
                  <TableCell className="font-medium">{e.setor}</TableCell>
                  <TableCell>{e.total}</TableCell><TableCell>{e.disponivel}</TableCell>
                  <TableCell>{e.em_uso}</TableCell><TableCell>{e.danificado}</TableCell><TableCell>{e.manutencao}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg">Ordens Abertas ({ordensAbertas.length})</CardTitle></CardHeader>
          <CardContent>
            {ordensAbertas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ordem aberta</p>}
            <div className="space-y-2">
              {ordensAbertas.slice(0, 10).map((o: any) => (
                <div key={o.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">OS #{o.numero} - {o.cliente}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.data_saida).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant="secondary">{statusLabels[o.status]}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg text-destructive">Ordens Atrasadas ({ordensAtrasadas.length})</CardTitle></CardHeader>
          <CardContent>
            {ordensAtrasadas.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma ordem atrasada</p>}
            <div className="space-y-2">
              {ordensAtrasadas.slice(0, 10).map((o: any) => (
                <div key={o.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">OS #{o.numero} - {o.cliente}</p>
                    <p className="text-xs text-destructive">Retorno: {new Date(o.data_retorno_prevista).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Badge variant="destructive">Atrasada</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Manutenções em Andamento</CardTitle></CardHeader>
        <CardContent>
          {manutencoes.filter((m: any) => !m.data_conclusao).length === 0 && <p className="text-sm text-muted-foreground">Nenhuma manutenção em andamento</p>}
          <div className="space-y-2">
            {manutencoes.filter((m: any) => !m.data_conclusao).map((m: any) => (
              <div key={m.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{m.equipamentos?.nome}</p>
                  <p className="text-xs text-muted-foreground">{m.tipo_reparo} — desde {new Date(m.data_inicio).toLocaleDateString("pt-BR")}</p>
                </div>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Em Andamento</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
