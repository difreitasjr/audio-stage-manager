import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useState } from "react";

const tipoLabels: Record<string, string> = {
  saida: "Saída", retorno: "Retorno", manutencao: "Manutenção", aquisicao: "Aquisição",
};
const tipoColors: Record<string, string> = {
  saida: "bg-red-100 text-red-800", retorno: "bg-green-100 text-green-800",
  manutencao: "bg-yellow-100 text-yellow-800", aquisicao: "bg-blue-100 text-blue-800",
};

export default function Movimentacao() {
  const [tipo, setTipo] = useState("");
  const [search, setSearch] = useState("");

  const { data: movimentacoes = [], isLoading } = useQuery({
    queryKey: ["movimentacoes", tipo, search],
    queryFn: async () => {
      let query = supabase.from("movimentacao_estoque")
        .select("*, equipamentos(nome, numero_serie), profiles!movimentacao_estoque_responsavel_id_fkey(nome), ordens_servico(numero)")
        .order("data_hora", { ascending: false });
      if (tipo) query = query.eq("tipo", tipo);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Movimentação de Estoque</h2>
        <p className="text-muted-foreground text-sm">{movimentacoes.length} registro(s)</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={tipo} onValueChange={v => setTipo(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(tipoLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>OS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimentacoes.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.data_hora).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="font-medium">{m.equipamentos?.nome}</TableCell>
                    <TableCell><Badge variant="secondary" className={tipoColors[m.tipo]}>{tipoLabels[m.tipo]}</Badge></TableCell>
                    <TableCell>{m.profiles?.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{m.motivo || "—"}</TableCell>
                    <TableCell>{m.ordens_servico ? `#${m.ordens_servico.numero}` : "—"}</TableCell>
                  </TableRow>
                ))}
                {movimentacoes.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma movimentação encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
