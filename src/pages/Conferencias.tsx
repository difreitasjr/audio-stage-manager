import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ClipboardCheck, AlertTriangle, Clock, CheckCircle2, ExternalLink, Copy, Search,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type ConferenciaRow = {
  id: string;
  ordem_id: string;
  token: string;
  status: string;
  conferente_nome: string | null;
  finalizada_em: string | null;
  created_at: string;
  ordens_servico: {
    numero: number;
    cliente: string;
    local_evento: string | null;
    data_saida: string;
    data_retorno_prevista: string;
    status: string;
    setor_id: string;
    setores?: { nome: string } | null;
  } | null;
};

type ItemProblema = {
  id: string;
  observacao: string | null;
  metodo_conferencia: string | null;
  conferido_em: string | null;
  equipamento_id: string;
  equipamentos?: { nome: string; numero_serie: string | null } | null;
  conferencias_chegada?: {
    id: string;
    token: string;
    conferente_nome: string | null;
    ordens_servico?: { numero: number; cliente: string } | null;
  } | null;
};

const statusLabels: Record<string, { label: string; className: string }> = {
  pendente: { label: "Pendente", className: "bg-slate-100 text-slate-700" },
  em_andamento: { label: "Em andamento", className: "bg-blue-100 text-blue-700" },
  concluida: { label: "Concluída", className: "bg-green-100 text-green-700" },
};

function isAtrasada(c: ConferenciaRow) {
  if (c.status === "concluida") return false;
  const prev = c.ordens_servico?.data_retorno_prevista;
  if (!prev) return false;
  return new Date(prev) < new Date(new Date().toDateString());
}

export default function Conferencias() {
  const { isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("todas");

  const { data: conferencias = [], isLoading } = useQuery({
    queryKey: ["conferencias-painel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferencias_chegada")
        .select(`
          id, ordem_id, token, status, conferente_nome, finalizada_em, created_at,
          ordens_servico:ordem_id (
            numero, cliente, local_evento, data_saida, data_retorno_prevista, status, setor_id,
            setores:setor_id ( nome )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ConferenciaRow[];
    },
  });

  const { data: problemas = [] } = useQuery({
    queryKey: ["conferencia-itens-problemas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferencia_itens")
        .select(`
          id, observacao, metodo_conferencia, conferido_em, equipamento_id,
          equipamentos:equipamento_id ( nome, numero_serie ),
          conferencias_chegada:conferencia_id (
            id, token, conferente_nome,
            ordens_servico:ordem_id ( numero, cliente )
          )
        `)
        .not("observacao", "is", null)
        .order("conferido_em", { ascending: false, nullsFirst: false })
        .limit(200);
      if (error) throw error;
      return (data || []).filter((i: any) => i.observacao && String(i.observacao).trim().length > 0) as unknown as ItemProblema[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return conferencias.filter((c) => {
      if (!q) return true;
      const os = c.ordens_servico;
      return (
        c.conferente_nome?.toLowerCase().includes(q) ||
        os?.cliente?.toLowerCase().includes(q) ||
        String(os?.numero ?? "").includes(q) ||
        os?.local_evento?.toLowerCase().includes(q)
      );
    });
  }, [conferencias, search]);

  const counts = useMemo(() => {
    const pendentes = conferencias.filter((c) => c.status === "pendente").length;
    const emAndamento = conferencias.filter((c) => c.status === "em_andamento").length;
    const concluidas = conferencias.filter((c) => c.status === "concluida").length;
    const atrasadas = conferencias.filter(isAtrasada).length;
    return { pendentes, emAndamento, concluidas, atrasadas, problemas: problemas.length };
  }, [conferencias, problemas]);

  const byTab = useMemo(() => {
    if (tab === "pendentes") return filtered.filter((c) => c.status === "pendente");
    if (tab === "andamento") return filtered.filter((c) => c.status === "em_andamento");
    if (tab === "concluidas") return filtered.filter((c) => c.status === "concluida");
    if (tab === "atrasadas") return filtered.filter(isAtrasada);
    return filtered;
  }, [filtered, tab]);

  const cards = [
    { label: "Pendentes", value: counts.pendentes, icon: Clock, color: "text-slate-600" },
    { label: "Em andamento", value: counts.emAndamento, icon: ClipboardCheck, color: "text-blue-600" },
    { label: "Concluídas", value: counts.concluidas, icon: CheckCircle2, color: "text-green-600" },
    { label: "Atrasadas", value: counts.atrasadas, icon: AlertTriangle, color: "text-red-600" },
    { label: "Itens c/ problema", value: counts.problemas, icon: AlertTriangle, color: "text-orange-600" },
  ];

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/conferencia/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado", description: url });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Conferências</h2>
        <p className="text-muted-foreground">
          Acompanhe o status das conferências de chegada {isAdmin ? "de todos os setores" : "do seu setor"}.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <c.icon className={`w-4 h-4 ${c.color}`} />
                <span className="text-xs text-muted-foreground font-medium">{c.label}</span>
              </div>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 justify-between">
          <CardTitle className="text-lg">Lista de Conferências</CardTitle>
          <div className="relative w-64 max-w-full">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Buscar OS, cliente, conferente..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="todas">Todas ({filtered.length})</TabsTrigger>
              <TabsTrigger value="pendentes">Pendentes ({counts.pendentes})</TabsTrigger>
              <TabsTrigger value="andamento">Em andamento ({counts.emAndamento})</TabsTrigger>
              <TabsTrigger value="concluidas">Concluídas ({counts.concluidas})</TabsTrigger>
              <TabsTrigger value="atrasadas" className="text-red-700">
                Atrasadas ({counts.atrasadas})
              </TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-0">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
              ) : byTab.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma conferência encontrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OS</TableHead>
                        <TableHead>Cliente / Local</TableHead>
                        {isAdmin && <TableHead>Setor</TableHead>}
                        <TableHead>Retorno previsto</TableHead>
                        <TableHead>Conferente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {byTab.map((c) => {
                        const atrasada = isAtrasada(c);
                        const s = statusLabels[c.status] || statusLabels.pendente;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">#{c.ordens_servico?.numero}</TableCell>
                            <TableCell>
                              <div className="font-medium">{c.ordens_servico?.cliente}</div>
                              <div className="text-xs text-muted-foreground">{c.ordens_servico?.local_evento || "—"}</div>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-sm">{c.ordens_servico?.setores?.nome || "—"}</TableCell>
                            )}
                            <TableCell className={atrasada ? "text-red-700 font-medium" : ""}>
                              {c.ordens_servico?.data_retorno_prevista
                                ? new Date(c.ordens_servico.data_retorno_prevista).toLocaleDateString("pt-BR")
                                : "—"}
                              {atrasada && <Badge className="ml-2 bg-red-100 text-red-700">Atrasada</Badge>}
                            </TableCell>
                            <TableCell className="text-sm">{c.conferente_nome || <span className="text-muted-foreground">—</span>}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={s.className}>{s.label}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center gap-1 justify-end">
                                <Button size="icon" variant="ghost" onClick={() => copyLink(c.token)} title="Copiar link">
                                  <Copy className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => window.open(`/conferencia/${c.token}`, "_blank")}
                                  title="Abrir conferência"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Itens marcados com problemas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {problemas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nenhum item com observação de problema.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Equipamento</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Conferente</TableHead>
                    <TableHead>Quando</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {problemas.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">
                        #{p.conferencias_chegada?.ordens_servico?.numero}
                        <div className="text-xs text-muted-foreground">{p.conferencias_chegada?.ordens_servico?.cliente}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{p.equipamentos?.nome || "—"}</div>
                        {p.equipamentos?.numero_serie && (
                          <div className="text-xs text-muted-foreground">SN: {p.equipamentos.numero_serie}</div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm whitespace-pre-wrap">{p.observacao}</div>
                      </TableCell>
                      <TableCell className="text-sm">{p.conferencias_chegada?.conferente_nome || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {p.conferido_em ? new Date(p.conferido_em).toLocaleString("pt-BR") : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
