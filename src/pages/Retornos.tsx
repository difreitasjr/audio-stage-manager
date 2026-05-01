import { useState } from "react";
import { Link } from "react-router-dom";
import { useConferenciasRetorno } from "@/hooks/useConferenciasRetorno";
import { useSetores } from "@/hooks/useSetores";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RotateCcw, ExternalLink, Search } from "lucide-react";

const statusBadge = (s: string) => {
  if (s === "finalizada") return <Badge className="bg-green-100 text-green-700">Finalizada</Badge>;
  if (s === "parcial") return <Badge className="bg-yellow-100 text-yellow-700">Parcial</Badge>;
  if (s === "em_andamento") return <Badge className="bg-blue-100 text-blue-700">Em andamento</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
};

export default function Retornos() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState<string>("all");
  const [setorId, setSetorId] = useState<string>("all");
  const [busca, setBusca] = useState("");
  const { data: setores } = useSetores();
  const { data, isLoading } = useConferenciasRetorno({
    status: status === "all" ? undefined : status,
    setor_id: setorId === "all" ? undefined : setorId,
  });

  const rows = (data || []).filter((r: any) => {
    if (!busca) return true;
    const q = busca.toLowerCase();
    return (
      String(r.ordens_servico?.numero || "").includes(q) ||
      (r.ordens_servico?.cliente || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RotateCcw className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Conferências de Retorno</h1>
          <p className="text-sm text-muted-foreground">Confira item-a-item os equipamentos que retornaram das OS</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input className="pl-8" placeholder="OS ou cliente" value={busca} onChange={e => setBusca(e.target.value)} />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="finalizada">Finalizada</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={setorId} onValueChange={setSetorId}>
              <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos setores</SelectItem>
                {setores?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Conferente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Iniciada</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!isLoading && rows.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma conferência de retorno encontrada</TableCell></TableRow>
              )}
              {rows.map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">#{r.ordens_servico?.numero}</TableCell>
                  <TableCell>{r.ordens_servico?.cliente}</TableCell>
                  <TableCell>{r.ordens_servico?.setores?.nome || "—"}</TableCell>
                  <TableCell>{r.conferente_nome || "—"}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>{r.iniciada_em ? new Date(r.iniciada_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link to={`/retornos/${r.id}`}><ExternalLink className="w-3.5 h-3.5 mr-1" />Abrir</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
