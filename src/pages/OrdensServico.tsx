import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useOrdens, useCreateOrdem, useUpdateOrdem, useRetornarOrdem } from "@/hooks/useOrdens";
import { useIniciarRetorno } from "@/hooks/useConferenciasRetorno";
import { useEquipamentos } from "@/hooks/useEquipamentos";
import { useSetores } from "@/hooks/useSetores";
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
import { Plus, Search, Eye, RotateCcw, ScanLine, FileDown, Pencil, Link2, QrCode, Copy } from "lucide-react";
import { ScannerDialog } from "@/components/ScannerDialog";
import { findEquipamentoByCode } from "@/hooks/useEquipamentos";
import { gerarOrdemPdf } from "@/lib/ordemPdf";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QRCodeSVG } from "qrcode.react";

const statusLabels: Record<string, string> = {
  aberta: "Aberta", em_andamento: "Em Andamento", retornado: "Retornado", atrasada: "Atrasada",
};
const statusColors: Record<string, string> = {
  aberta: "bg-blue-100 text-blue-800", em_andamento: "bg-yellow-100 text-yellow-800",
  retornado: "bg-green-100 text-green-800", atrasada: "bg-red-100 text-red-800",
};

export default function OrdensServico() {
  const { isAdmin, profile } = useAuth();
  const [filters, setFilters] = useState({ status: "", setor_id: "", search: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewOrdem, setViewOrdem] = useState<any>(null);
  const [editOrdemId, setEditOrdemId] = useState<string | null>(null);
  const [itens, setItens] = useState<{ equipamento_id: string; quantidade: number }[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const handleScanAdd = async (code: string) => {
    const eq = await findEquipamentoByCode(code);
    if (!eq) return toast.error(`Não encontrado: ${code}`);
    if (form.setor_id && eq.setor_id !== form.setor_id) return toast.error(`${eq.nome} é de outro setor`);
    setItens((prev) => {
      const idx = prev.findIndex(i => i.equipamento_id === eq.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantidade: copy[idx].quantidade + 1 };
        return copy;
      }
      return [...prev, { equipamento_id: eq.id, quantidade: 1 }];
    });
    toast.success(`Adicionado: ${eq.nome}`);
  };

  const activeFilters = {
    status: filters.status || undefined,
    setor_id: filters.setor_id || undefined,
    search: filters.search || undefined,
  };
  const { data: ordens = [], isLoading } = useOrdens(activeFilters);
  const { data: equipamentosDisp = [] } = useEquipamentos();
  const { data: setores = [] } = useSetores();

  const createMut = useCreateOrdem();
  const updateMut = useUpdateOrdem();
  const retornarMut = useRetornarOrdem();
  const iniciarRetorno = useIniciarRetorno();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    data_saida: "", data_retorno_prevista: "", responsavel_nome: "",
    setor_id: "", cliente: "", contato_cliente: "", local_evento: "",
    descricao_servico: "", observacoes: "",
    checklist_funciona: false, checklist_acessorios: false, checklist_completo: false,
  });

  const openCreate = () => {
    setEditOrdemId(null);
    setForm({
      data_saida: new Date().toISOString().split("T")[0],
      data_retorno_prevista: "", responsavel_nome: profile?.nome || "",
      setor_id: profile?.setor_id || "", cliente: "", contato_cliente: "",
      local_evento: "", descricao_servico: "", observacoes: "",
      checklist_funciona: false, checklist_acessorios: false, checklist_completo: false,
    });
    setItens([]);
    setDialogOpen(true);
  };

  const openEdit = (o: any) => {
    setEditOrdemId(o.id);
    setForm({
      data_saida: o.data_saida || "",
      data_retorno_prevista: o.data_retorno_prevista || "",
      responsavel_nome: o.responsavel_nome || "",
      setor_id: o.setor_id || "",
      cliente: o.cliente || "",
      contato_cliente: o.contato_cliente || "",
      local_evento: o.local_evento || "",
      descricao_servico: o.descricao_servico || "",
      observacoes: o.observacoes || "",
      checklist_funciona: !!o.checklist_funciona,
      checklist_acessorios: !!o.checklist_acessorios,
      checklist_completo: !!o.checklist_completo,
    });
    setItens((o.ordem_equipamentos || []).map((oe: any) => ({
      equipamento_id: oe.equipamento_id, quantidade: oe.quantidade || 1,
    })));
    setViewOrdem(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.cliente || !form.data_saida || !form.data_retorno_prevista || !form.setor_id || !form.responsavel_nome.trim()) return;
    if (itens.length === 0) return toast.error("Adicione ao menos um equipamento");
    const ordemPayload = {
      data_saida: form.data_saida, data_retorno_prevista: form.data_retorno_prevista,
      responsavel_nome: form.responsavel_nome.trim(), setor_id: form.setor_id,
      cliente: form.cliente,
      contato_cliente: form.contato_cliente || null,
      local_evento: form.local_evento || null,
      descricao_servico: form.descricao_servico || null,
      observacoes: form.observacoes || null,
      checklist_funciona: form.checklist_funciona,
      checklist_acessorios: form.checklist_acessorios,
      checklist_completo: form.checklist_completo,
    };
    if (editOrdemId) {
      await updateMut.mutateAsync({ id: editOrdemId, ordem: ordemPayload as any, itens });
    } else {
      await createMut.mutateAsync({ ordem: ordemPayload as any, itens });
    }
    setDialogOpen(false);
  };

  const addItem = (id: string) => {
    setItens(prev => prev.find(i => i.equipamento_id === id) ? prev : [...prev, { equipamento_id: id, quantidade: 1 }]);
  };
  const removeItem = (id: string) => setItens(prev => prev.filter(i => i.equipamento_id !== id));
  const setQty = (id: string, qty: number) => {
    setItens(prev => prev.map(i => i.equipamento_id === id ? { ...i, quantidade: Math.max(1, qty) } : i));
  };

  const filteredEquips = equipamentosDisp.filter((e: any) => !form.setor_id || e.setor_id === form.setor_id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Ordens de Serviço</h2>
          <p className="text-muted-foreground text-sm">{ordens.length} ordem(ns)</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Nova Ordem</Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por cliente..." className="pl-9"
                value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            {isAdmin && (
              <Select value={filters.setor_id} onValueChange={v => setFilters(f => ({ ...f, setor_id: v === "all" ? "" : v }))}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
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
                {ordens.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">#{o.numero}</TableCell>
                    <TableCell>{new Date(o.data_saida).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{o.cliente}</TableCell>
                    <TableCell>{o.responsavel_nome || "—"}</TableCell>
                    <TableCell>{o.setores?.nome}</TableCell>
                    <TableCell>{(o.ordem_equipamentos || []).reduce((s: number, oe: any) => s + (oe.quantidade || 1), 0)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[o.status]}>{statusLabels[o.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewOrdem(o)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(o)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => gerarOrdemPdf(o)} title="Baixar PDF"><FileDown className="w-4 h-4" /></Button>
                        {o.status !== "retornado" && o.status !== "finalizada" && (
                          <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800"
                            onClick={() => iniciarRetorno.mutate(o.id, { onSuccess: (cid) => navigate(`/retornos/${cid}`) })}
                            title="Iniciar conferência de retorno">
                            <RotateCcw className="w-4 h-4 mr-1" />Retorno
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {ordens.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma ordem encontrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewOrdem} onOpenChange={() => setViewOrdem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ordem de Serviço #{viewOrdem?.numero}</DialogTitle>
          </DialogHeader>
          {viewOrdem && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-muted-foreground">Cliente:</span> <p className="font-medium">{viewOrdem.cliente}</p></div>
                <div><span className="text-muted-foreground">Contato:</span> <p className="font-medium">{viewOrdem.contato_cliente || "—"}</p></div>
                <div><span className="text-muted-foreground">Data Saída:</span> <p className="font-medium">{new Date(viewOrdem.data_saida).toLocaleDateString("pt-BR")}</p></div>
                <div><span className="text-muted-foreground">Retorno Previsto:</span> <p className="font-medium">{new Date(viewOrdem.data_retorno_prevista).toLocaleDateString("pt-BR")}</p></div>
                <div><span className="text-muted-foreground">Local:</span> <p className="font-medium">{viewOrdem.local_evento || "—"}</p></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant="secondary" className={statusColors[viewOrdem.status]}>{statusLabels[viewOrdem.status]}</Badge></div>
              </div>
              {viewOrdem.descricao_servico && <div><span className="text-muted-foreground">Descrição:</span><p>{viewOrdem.descricao_servico}</p></div>}
              <div>
                <span className="text-muted-foreground">Equipamentos:</span>
                <ul className="mt-1 space-y-1">
                  {viewOrdem.ordem_equipamentos?.map((oe: any) => (
                    <li key={oe.id} className="text-sm">• {oe.quantidade || 1}× {oe.equipamentos?.nome || oe.equipamento_id}</li>
                  ))}
                  {(!viewOrdem.ordem_equipamentos || viewOrdem.ordem_equipamentos.length === 0) && <li className="text-muted-foreground">Nenhum equipamento</li>}
                </ul>
              </div>

              <ConferenciaPanel ordemId={viewOrdem.id} />

              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {viewOrdem.status !== "retornado" && viewOrdem.status !== "finalizada" && (
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => iniciarRetorno.mutate(viewOrdem.id, {
                      onSuccess: (cid) => { setViewOrdem(null); navigate(`/retornos/${cid}`); }
                    })}>
                    <RotateCcw className="w-4 h-4 mr-1" />Conferência de Retorno
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(viewOrdem)}>
                  <Pencil className="w-4 h-4 mr-1" />Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => gerarOrdemPdf(viewOrdem)}>
                  <FileDown className="w-4 h-4 mr-1" />Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editOrdemId ? "Editar Ordem de Serviço" : "Nova Ordem de Serviço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Saída *</Label>
                <Input type="date" value={form.data_saida} onChange={e => setForm(f => ({ ...f, data_saida: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Data de Retorno Prevista *</Label>
                <Input type="date" value={form.data_retorno_prevista} onChange={e => setForm(f => ({ ...f, data_retorno_prevista: e.target.value }))} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Responsável *</Label>
                <Input
                  value={form.responsavel_nome}
                  onChange={e => setForm(f => ({ ...f, responsavel_nome: e.target.value }))}
                  placeholder="Nome do responsável pelo evento"
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={form.setor_id} onValueChange={v => setForm(f => ({ ...f, setor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Input value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={form.contato_cliente} onChange={e => setForm(f => ({ ...f, contato_cliente: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local do Evento</Label>
              <Input value={form.local_evento} onChange={e => setForm(f => ({ ...f, local_evento: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição do Serviço</Label>
              <Textarea value={form.descricao_servico} onChange={e => setForm(f => ({ ...f, descricao_servico: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>

            {/* Equipment selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Equipamentos</Label>
                <div className="flex gap-2">
                  <Select value="" onValueChange={addItem}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="+ Adicionar equipamento" /></SelectTrigger>
                    <SelectContent>
                      {filteredEquips
                        .filter((e: any) => !itens.find(i => i.equipamento_id === e.id))
                        .map((e: any) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.nome}{e.numero_serie ? ` (${e.numero_serie})` : ""}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
                    <ScanLine className="w-4 h-4 mr-1" />Escanear
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg p-2 space-y-2 min-h-[60px]">
                {itens.length === 0 && <p className="text-sm text-muted-foreground p-2">Nenhum equipamento adicionado</p>}
                {itens.map(item => {
                  const eq = equipamentosDisp.find((e: any) => e.id === item.equipamento_id);
                  return (
                    <div key={item.equipamento_id} className="flex items-center gap-2 bg-muted/40 rounded p-2">
                      <Input
                        type="number" min={1} value={item.quantidade}
                        onChange={e => setQty(item.equipamento_id, parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                      <span className="text-sm flex-1">{eq?.nome || "—"} {eq?.numero_serie ? `(${eq.numero_serie})` : ""}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.equipamento_id)}>Remover</Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {itens.reduce((s, i) => s + i.quantidade, 0)} unidade(s) em {itens.length} item(s)
              </p>
            </div>

            {/* Checklist */}
            <div className="space-y-2">
              <Label>Checklist Pré-Entrega</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <Checkbox checked={form.checklist_funciona} onCheckedChange={v => setForm(f => ({ ...f, checklist_funciona: !!v }))} />
                  <span className="text-sm">Equipamento funcionando corretamente</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={form.checklist_acessorios} onCheckedChange={v => setForm(f => ({ ...f, checklist_acessorios: !!v }))} />
                  <span className="text-sm">Todos os acessórios incluídos</span>
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox checked={form.checklist_completo} onCheckedChange={v => setForm(f => ({ ...f, checklist_completo: !!v }))} />
                  <span className="text-sm">Kit completo e verificado</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {editOrdemId ? "Salvar Alterações" : "Criar Ordem"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScanAdd} title="Escanear para adicionar à OS" />
    </div>
  );
}

function ConferenciaPanel({ ordemId }: { ordemId: string }) {
  const { data: conf } = useQuery({
    queryKey: ["conferencia-ordem", ordemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conferencias_chegada")
        .select("id, token, status, conferente_nome, finalizada_em")
        .eq("ordem_id", ordemId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!conf) {
    return (
      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
        Nenhuma conferência associada a esta OS ainda.
      </div>
    );
  }

  const url = `${window.location.origin}/conferencia/${conf.token}`;
  const statusLabel = conf.status === "concluida" ? "Concluída" : conf.status === "em_andamento" ? "Em andamento" : "Pendente";
  const statusColor = conf.status === "concluida" ? "bg-green-100 text-green-800" : conf.status === "em_andamento" ? "bg-yellow-100 text-yellow-800" : "bg-blue-100 text-blue-800";

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copiado"); }
    catch { toast.error("Não foi possível copiar"); }
  };

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Conferência de chegada</span>
        </div>
        <Badge variant="secondary" className={statusColor}>{statusLabel}</Badge>
      </div>
      {conf.conferente_nome && (
        <p className="text-xs text-muted-foreground">Conferente: <strong>{conf.conferente_nome}</strong></p>
      )}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="bg-white p-2 rounded border">
          <QRCodeSVG value={url} size={96} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-xs text-muted-foreground break-all">{url}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copy}>
              <Copy className="w-3 h-3 mr-1" />Copiar link
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.open(url, "_blank")}>
              <QrCode className="w-3 h-3 mr-1" />Abrir
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Compartilhe este link com quem irá receber os equipamentos no local. Não precisa de login.</p>
        </div>
      </div>
    </div>
  );
}
