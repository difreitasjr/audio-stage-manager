import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const destinoLabels: Record<string, string> = {
  disponivel: "Disponível", manutencao: "Manutenção", danificado: "Danificado", pendente: "Pendente",
};
const destinoColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-700",
  manutencao: "bg-orange-100 text-orange-700",
  danificado: "bg-red-100 text-red-700",
  pendente: "bg-gray-100 text-gray-700",
};

export function RelatorioRetornos() {
  const [from, setFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["relatorio_retornos", from, to],
    queryFn: async () => {
      const { data: confs } = await supabase
        .from("conferencias_retorno")
        .select("id, status, finalizada_em, conferente_nome, ordens_servico(numero, cliente, setores(nome))")
        .gte("created_at", from + "T00:00:00")
        .lte("created_at", to + "T23:59:59")
        .order("finalizada_em", { ascending: false });
      const ids = (confs || []).map((c: any) => c.id);
      if (ids.length === 0) return { confs: [], itens: [] };
      const { data: itens } = await supabase
        .from("conferencia_retorno_itens")
        .select("*, equipamentos(nome)")
        .in("conferencia_id", ids);
      return { confs: confs || [], itens: itens || [] };
    },
  });

  const itens = data?.itens || [];
  const confs = data?.confs || [];

  const counts = useMemo(() => {
    const c = { disponivel: 0, manutencao: 0, danificado: 0, pendente: 0 } as Record<string, number>;
    itens.forEach((i: any) => { c[i.destino] = (c[i.destino] || 0) + 1; });
    return c;
  }, [itens]);

  const total = itens.length || 1;
  const chart = Object.entries(destinoLabels).map(([k, label]) => ({ name: label, valor: counts[k] || 0 }));

  const exportCSV = () => {
    const headers = ["OS", "Cliente", "Setor", "Equipamento", "Destino", "Observação", "Conferente", "Finalizada em"];
    const rows = itens.map((i: any) => {
      const conf = confs.find((c: any) => c.id === i.conferencia_id) as any;
      return [
        conf?.ordens_servico?.numero || "",
        conf?.ordens_servico?.cliente || "",
        conf?.ordens_servico?.setores?.nome || "",
        i.equipamentos?.nome || i.nome_avulso || "",
        destinoLabels[i.destino] || i.destino,
        i.observacao || "",
        conf?.conferente_nome || "",
        conf?.finalizada_em ? new Date(conf.finalizada_em).toLocaleString("pt-BR") : "",
      ];
    });
    const escape = (v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `retornos-${from}-a-${to}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="text-lg">Relatório de Retornos ao Estoque</CardTitle>
          <div className="flex items-center gap-2">
            <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
            <span className="text-muted-foreground text-sm">até</span>
            <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" />CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            {Object.entries(destinoLabels).map(([k, label]) => (
              <div key={k} className="p-4 rounded-lg border">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-2xl font-bold">{counts[k] || 0}</p>
                <p className="text-xs text-muted-foreground">{(((counts[k] || 0) / total) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="valor" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Histórico detalhado ({itens.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead><TableHead>Cliente</TableHead><TableHead>Equipamento</TableHead>
                <TableHead>Destino</TableHead><TableHead>Observação</TableHead><TableHead>Conferente</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && itens.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nenhum retorno no período</TableCell></TableRow>}
              {itens.map((i: any) => {
                const conf = confs.find((c: any) => c.id === i.conferencia_id) as any;
                return (
                  <TableRow key={i.id}>
                    <TableCell>#{conf?.ordens_servico?.numero || "—"}</TableCell>
                    <TableCell>{conf?.ordens_servico?.cliente || "—"}</TableCell>
                    <TableCell>{i.equipamentos?.nome || i.nome_avulso || "—"}</TableCell>
                    <TableCell><Badge className={destinoColors[i.destino]}>{destinoLabels[i.destino]}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{i.observacao || "—"}</TableCell>
                    <TableCell>{conf?.conferente_nome || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
