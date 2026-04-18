import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOrdens, useCreateOrdem, useRetornarOrdem } from "@/hooks/useOrdens";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useSetores } from "@/hooks/useSetores";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Eye, RotateCcw, ScanLine, Loader2 } from "lucide-react";
import { ScannerDialog } from "@/components/ScannerDialog";
import { findEquipamentoByCode } from "@/hooks/useEquipamentos";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  aberta: "Aberta",
  em_andamento: "Em Andamento",
  retornado: "Retornado",
  atrasada: "Atrasada",
};

const statusColors: Record<string, string> = {
  aberta: "bg-blue-100 text-blue-800",
  em_andamento: "bg-yellow-100 text-yellow-800",
  retornado: "bg-green-100 text-green-800",
  atrasada: "bg-red-100 text-red-800",
};

export default function OrdensServico() {
  const { isAdmin, user } = useAuth();
  const [filters, setFilters] = useState({ status: "", setor_id: "", search: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOrdem, setViewOrdem] = useState<any>(null);
  const [selectedEquips, setSelectedEquips] = useState<string[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanAdd = async (code: string) => {
    const eq = await findEquipamentoByCode(code);
    if (!eq) {
      toast.error(`Equipamento não encontrado: ${code}`);
      return;
    }
    if (eq.status !== "disponivel") {
      toast.error(`${eq.nome} não está disponível`);
      return;
    }
    if (form.setor_id && eq.setor_id !== form.setor_id) {
      toast.error(`${eq.nome} é de outro setor`);
      return;
    }
    if (!selectedEquips.includes(eq.id)) {
      setSelectedEquips((prev) => [...prev, eq.id]);
      toast.success(`✅ Adicionado: ${eq.nome}`);
    } else {
      toast.info(`${eq.nome} já foi adicionado`);
    }
  };

  const activeFilters = {
    status: filters.status || undefined,
    setor_id: filters.setor_id || undefined,
    search: filters.search || undefined,
  };

  const { data: ordens = [], isLoading } = useOrdens(activeFilters);
  const { data: equipamentosDisp = [] } = useEquipamentos({ status: "disponivel" });
  const { data: setores = [] } = useSetores();

  const { data: responsaveis = [] } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_users")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  const createMut = useCreateOrdem();
  const retornarMut = useRetornarOrdem();

  const [form, setForm] = useState({
    data_saida: "",
    data_retorno_prevista: "",
    responsavel_id: "",
    setor_id: "",
    cliente: "",
    contato_cliente: "",
    local_evento: "",
    descricao_servico: "",
    observacoes: "",
    checklist_funciona: false,
    checklist_acessorios: false,
    checklist_completo: false,
  });

  const openCreate = () => {
    const hoje = new Date().toISOString().split("T")[0];
    const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    setForm({
      data_saida: hoje,
      data_retorno_prevista: amanha,
      responsavel_id: user?.id || "",
      setor_id: "",
      cliente: "",
      contato_cliente: "",
      local_evento: "",
      descricao_servico: "",
      observacoes: "",
      checklist_funciona: false,
      checklist_acessorios: false,
      checklist_completo: false,
    });
    setSelectedEquips([]);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.cliente || !form.data_saida || !form.data_retorno_prevista || !form.setor_id || !form.responsavel_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      await createMut.mutateAsync({
        ordem: {
          data_saida: form.data_saida,
          data_retorno_prevista: form.data_retorno_prevista,
          responsavel_id: form.responsavel_id,
          setor_id: form.setor_id,
          cliente: form.cliente,
          contato_cliente: form.contato_cliente || undefined,
          local_evento: form.local_evento || undefined,
          descricao_servico: form.descricao_servico || undefined,
          observacoes: form.observacoes || undefined,
          checklist_funciona: form.checklist_funciona,
          checklist_acessorios: form.checklist_acessorios,
          checklist_completo: form.checklist_completo,
        },
        equipamento_ids: selectedEquips,
      });
      setDialogOpen(false);
    } catch (error) {
      console.error("Erro ao criar ordem:", error);
    }
  };

  const toggleEquip = (id: string) => {
    setSelectedEquips((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const filteredEquips = equipamentosDisp.filter(
    (e: any) => !form.setor_id || e.setor_id === form.setor_id
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Ordens de Serviço</h2>
          <p className="text-muted-foreground text-sm">
            {ordens.length} ordem(ns) registrada(s)
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          Nova Ordem
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente..."
                className="pl-9"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
              />
            </div>
            <Select
              value={filters.status}
              onValueChange={(v) =>
                setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))
              }
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select
                value={filters.setor_id}
                onValueChange={(v) =>
                  setFilters((f) => ({ ...f, setor_id: v === "all" ? "" : v }))
                }
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {setores.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Ordens */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Ordem</TableHead>
                  <TableHead>Data Saída</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Equip.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="w-4 h-4 animate-spin inline" />
                    </TableCell>
                  </TableRow>
                ) : ordens.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      Nenhuma ordem encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  ordens.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">
                        {o.numero_ordem || `#${o.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell>
                        {new Date(o.data_saida).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{o.cliente}</TableCell>
                      <TableCell>{o.app_users?.nome || "—"}</TableCell>
                      <TableCell>{o.setores?.nome || "—"}</TableCell>
                      <TableCell>{o.ordem_equipamentos?.length || 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={statusColors[o.status] || ""}
                        >
                          {statusLabels[o.status] || o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewOrdem(o)}
                            title="Visualizar"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {o.status !== "retornado" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => retornarMut.mutate(o.id)}
                              disabled={retornarMut.isPending}
                              title="Retornar ordem"
                            >
                              <RotateCcw className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Visualizar Ordem */}
      <Dialog open={!!viewOrdem} onOpenChange={() => setViewOrdem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Ordem de Serviço {viewOrdem?.numero_ordem || `#${viewOrdem?.id.slice(0, 8)}`}
            </DialogTitle>
          </DialogHeader>
          {viewOrdem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <p className="font-medium">{viewOrdem.cliente}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contato:</span>
                  <p className="font-medium">{viewOrdem.contato_cliente || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data Saída:</span>
                  <p className="font-medium">
                    {new Date(viewOrdem.data_saida).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Retorno Previsto:</span>
                  <p className="font-medium">
                    {new Date(
                      viewOrdem.data_retorno_prevista
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Local:</span>
                  <p className="font-medium">{viewOrdem.local_evento || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <Badge
                    variant="secondary"
                    className={statusColors[viewOrdem.status] || ""}
                  >
                    {statusLabels[viewOrdem.status] || viewOrdem.status}
                  </Badge>
                </div>
              </div>

              {viewOrdem.descricao_servico && (
                <div>
                  <span className="text-muted-foreground">Descrição:</span>
                  <p className="mt-1">{viewOrdem.descricao_servico}</p>
                </div>
              )}

              <div>
                <span className="text-muted-foreground">Equipamentos:</span>
                <ul className="mt-2 space-y-1 pl-4">
                  {viewOrdem.ordem_equipamentos &&
                  viewOrdem.ordem_equipamentos.length > 0 ? (
                    viewOrdem.ordem_equipamentos.map((oe: any) => (
                      <li key={oe.id} className="text-sm list-disc">
                        {oe.equipamentos?.nome ||
                          `Equipamento ${oe.equipamento_id}`}
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground text-sm">
                      Nenhum equipamento
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-1 text-xs border-t pt-3">
                <div className="flex justify-between">
                  <span>✅ Funciona:</span>
                  <span className="font-medium">
                    {viewOrdem.checklist_funciona ? "Sim" : "Não"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>✅ Acessórios:</span>
                  <span className="font-medium">
                    {viewOrdem.checklist_acessorios ? "Sim" : "Não"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>✅ Completo:</span>
                  <span className="font-medium">
                    {viewOrdem.checklist_completo ? "Sim" : "Não"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Criar Ordem */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_saida">Data de Saída *</Label>
                <Input
                  id="data_saida"
                  type="date"
                  value={form.data_saida}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, data_saida: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_retorno">Data de Retorno Prevista *</Label>
                <Input
                  id="data_retorno"
                  type="date"
                  value={form.data_retorno_prevista}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      data_retorno_prevista: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável *</Label>
                <Select
                  value={form.responsavel_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, responsavel_id: v }))
                  }
                >
                  <SelectTrigger id="responsavel">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {responsaveis.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="setor">Setor *</Label>
                <Select
                  value={form.setor_id}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, setor_id: v }))
                  }
                >
                  <SelectTrigger id="setor">
                    <SelectValue placeholder="Selecione um setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setores.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Input
                  id="cliente"
                  value={form.cliente}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cliente: e.target.value }))
                  }
                  placeholder="Nome do cliente"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contato">Contato</Label>
                <Input
                  id="contato"
                  value={form.contato_cliente}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contato_cliente: e.target.value }))
                  }
                  placeholder="Telefone ou Email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">Local do Evento</Label>
              <Input
                id="local"
                value={form.local_evento}
                onChange={(e) =>
                  setForm((f) => ({ ...f, local_evento: e.target.value }))
                }
                placeholder="Endereço ou local"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição do Serviço</Label>
              <Textarea
                id="descricao"
                value={form.descricao_servico}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descricao_servico: e.target.value }))
                }
                placeholder="Descreva o serviço a ser realizado"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                value={form.observacoes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, observacoes: e.target.value }))
                }
                placeholder="Observações adicionais"
                rows={3}
              />
            </div>

            {/* Seleção de Equipamentos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Equipamentos Disponíveis</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                >
                  <ScanLine className="w-4 h-4 mr-1" />
                  Escanear QR
                </Button>
              </div>

              {filteredEquips.length === 0 ? (
                <div className="border rounded-lg p-4 text-center text-muted-foreground">
                  {form.setor_id
                    ? "Nenhum equipamento disponível neste setor"
                    : "Selecione um setor para ver equipamentos"}
                </div>
              ) : (
                <div className="border rounded-lg max-h-48 overflow-y-auto p-3 space-y-2">
                  {filteredEquips.map((e: any) => (
                    <label
                      key={e.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-secondary p-2 rounded transition"
                    >
                      <Checkbox
                        checked={selectedEquips.includes(e.id)}
                        onCheckedChange={() => toggleEquip(e.id)}
                      />
                      <span className="text-sm flex-1">{e.nome}</span>
                      {e.numero_serie && (
                        <span className="text-xs text-muted-foreground">
                          {e.numero_serie}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {selectedEquips.length} equipamento(s) selecionado(s)
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2 border-t pt-4">
              <Label>Checklist Pré-Entrega</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.checklist_funciona}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, checklist_funciona: !!v }))
                    }
                  />
                  <span className="text-sm">
                    Equipamento funcionando corretamente
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.checklist_acessorios}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, checklist_acessorios: !!v }))
                    }
                  />
                  <span className="text-sm">Todos os acessórios incluídos</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={form.checklist_completo}
                    onCheckedChange={(v) =>
                      setForm((f) => ({ ...f, checklist_completo: !!v }))
                    }
                  />
                  <span className="text-sm">Kit completo e verificado</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar Ordem
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Scanner Dialog */}
      <ScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onScan={handleScanAdd}
        title="Escanear equipamento para adicionar à OS"
      />
    </div>
  );
}
