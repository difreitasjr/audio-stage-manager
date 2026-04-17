import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEquipamentos, useCreateEquipamento, useUpdateEquipamento, useDeleteEquipamento, findEquipamentoByCode } from "@/hooks/useEquipamentos";
import { useSetores } from "@/hooks/useSetores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Download, ScanLine, QrCode } from "lucide-react";
import { toast } from "sonner";
import { ScannerDialog } from "@/components/ScannerDialog";
import { QrLabelDialog } from "@/components/QrLabelDialog";

const statusLabels: Record<string, string> = {
  disponivel: "Disponível", em_uso: "Em Uso", danificado: "Danificado", manutencao: "Manutenção",
};
const statusColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-800", em_uso: "bg-blue-100 text-blue-800",
  danificado: "bg-red-100 text-red-800", manutencao: "bg-yellow-100 text-yellow-800",
};

interface EquipForm {
  nome: string; numero_serie: string; setor_id: string; status: string;
  localizacao: string; data_aquisicao: string; valor: string; observacoes: string;
  marca: string; modelo: string; categoria: string; codigo_barras: string;
}

const emptyForm: EquipForm = {
  nome: "", numero_serie: "", setor_id: "", status: "disponivel",
  localizacao: "", data_aquisicao: "", valor: "", observacoes: "",
  marca: "", modelo: "", categoria: "", codigo_barras: "",
};

export default function Equipamentos() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState({ setor_id: "", status: "", search: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipForm>(emptyForm);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [labelEquip, setLabelEquip] = useState<any | null>(null);

  const activeFilters = {
    setor_id: filters.setor_id || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined,
  };
  const { data: equipamentos = [], isLoading } = useEquipamentos(activeFilters);
  const { data: setores = [] } = useSetores();
  const createMut = useCreateEquipamento();
  const updateMut = useUpdateEquipamento();
  const deleteMut = useDeleteEquipamento();

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({
      nome: e.nome, numero_serie: e.numero_serie || "", setor_id: e.setor_id, status: e.status,
      localizacao: e.localizacao || "", data_aquisicao: e.data_aquisicao || "",
      valor: e.valor?.toString() || "", observacoes: e.observacoes || "",
      marca: e.marca || "", modelo: e.modelo || "", categoria: e.categoria || "",
      codigo_barras: e.codigo_barras || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.setor_id) {
      toast.error("Nome e Setor são obrigatórios");
      return;
    }
    const payload = {
      nome: form.nome, numero_serie: form.numero_serie || undefined,
      setor_id: form.setor_id, status: form.status,
      localizacao: form.localizacao || undefined,
      data_aquisicao: form.data_aquisicao || undefined,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      observacoes: form.observacoes || undefined,
      marca: form.marca || undefined, modelo: form.modelo || undefined,
      categoria: form.categoria || undefined,
      codigo_barras: form.codigo_barras || undefined,
    };
    if (editId) await updateMut.mutateAsync({ id: editId, ...payload });
    else await createMut.mutateAsync(payload as any);
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir equipamento?")) return;
    await deleteMut.mutateAsync(id);
  };

  const handleScan = async (code: string) => {
    const eq = await findEquipamentoByCode(code);
    if (eq) { openEdit(eq); toast.success(`Encontrado: ${eq.nome}`); }
    else toast.error(`Nenhum equipamento para: ${code}`);
  };

  const exportCSV = () => {
    const headers = ["Nome", "Marca", "Modelo", "Categoria", "Nº Série", "Cód. Barras", "Setor", "Status", "Valor"];
    const rows = equipamentos.map((e: any) => [
      e.nome, e.marca || "", e.modelo || "", e.categoria || "",
      e.numero_serie || "", e.codigo_barras || "",
      (e.setores as any)?.nome || "", statusLabels[e.status], e.valor || "",
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "equipamentos.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Equipamentos</h2>
          <p className="text-muted-foreground text-sm">{equipamentos.length} equipamento(s)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setScannerOpen(true)}>
            <ScanLine className="w-4 h-4 mr-1" />Escanear
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-1" />CSV
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" />Novo
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, série, marca..." className="pl-9"
                value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
            </div>
            <Select value={filters.setor_id} onValueChange={(v) => setFilters((f) => ({ ...f, setor_id: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Marca/Modelo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Cód. Barras</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map((equip: any) => (
                  <TableRow key={equip.id}>
                    <TableCell className="font-medium">{equip.nome}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {equip.marca || equip.modelo ? `${equip.marca || ""} ${equip.modelo || ""}`.trim() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{equip.categoria || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{equip.numero_serie || "—"}</TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">{equip.codigo_barras || "—"}</TableCell>
                    <TableCell>{(equip.setores as any)?.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[equip.status]}>{statusLabels[equip.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {equip.valor ? `R$ ${Number(equip.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setLabelEquip(equip)} title="Etiqueta QR">
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(equip)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(equip.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {equipamentos.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhum equipamento encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} placeholder="Ex: Microfone, Mesa de Som" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Marca</Label>
                <Input value={form.marca} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Modelo</Label>
                <Input value={form.modelo} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nº Série</Label>
                <Input value={form.numero_serie} onChange={(e) => setForm((f) => ({ ...f, numero_serie: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input value={form.codigo_barras} onChange={(e) => setForm((f) => ({ ...f, codigo_barras: e.target.value }))} placeholder="EAN/Code128" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={form.setor_id} onValueChange={(v) => setForm((f) => ({ ...f, setor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input value={form.localizacao} onChange={(e) => setForm((f) => ({ ...f, localizacao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data Aquisição</Label>
                <Input type="date" value={form.data_aquisicao} onChange={(e) => setForm((f) => ({ ...f, data_aquisicao: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>
                {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} title="Escanear equipamento" />
      <QrLabelDialog open={!!labelEquip} onOpenChange={(v) => !v && setLabelEquip(null)} equipamento={labelEquip} />
    </div>
  );
}
