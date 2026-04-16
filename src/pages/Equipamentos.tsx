import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEquipamentos, useCreateEquipamento, useUpdateEquipamento, useDeleteEquipamento } from "@/hooks/useEquipamentos";
import { useSetores } from "@/hooks/useSetores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Download } from "lucide-react";
import { toast } from "sonner";

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
}

const emptyForm: EquipForm = {
  nome: "", numero_serie: "", setor_id: "", status: "disponivel",
  localizacao: "", data_aquisicao: "", valor: "", observacoes: "",
};

export default function Equipamentos() {
  const { isAdmin } = useAuth();
  const [filters, setFilters] = useState({ setor_id: "", status: "", search: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipForm>(emptyForm);

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
      nome: e.nome, numero_serie: e.numero_serie || "", setor_id: e.setor_id,
      status: e.status, localizacao: e.localizacao || "", data_aquisicao: e.data_aquisicao || "",
      valor: e.valor?.toString() || "", observacoes: e.observacoes || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.setor_id) { toast.error("Nome e Setor são obrigatórios"); return; }
    const payload = {
      nome: form.nome, numero_serie: form.numero_serie || undefined, setor_id: form.setor_id,
      status: form.status, localizacao: form.localizacao || undefined,
      data_aquisicao: form.data_aquisicao || undefined,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      observacoes: form.observacoes || undefined,
    };
    if (editId) {
      await updateMut.mutateAsync({ id: editId, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este equipamento?")) return;
    await deleteMut.mutateAsync(id);
  };

  const exportCSV = () => {
    const headers = ["Nome", "Nº Série", "Setor", "Status", "Localização", "Valor"];
    const rows = equipamentos.map((e: any) => [
      e.nome, e.numero_serie || "", (e.setores as any)?.nome || "", statusLabels[e.status], e.localizacao || "", e.valor || "",
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "equipamentos.csv"; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Equipamentos</h2>
          <p className="text-muted-foreground text-sm">{equipamentos.length} equipamento(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="w-4 h-4 mr-1" />CSV</Button>
          {isAdmin && <Button size="sm" onClick={openCreate}><Plus className="w-4 h-4 mr-1" />Novo</Button>}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome ou série..." className="pl-9"
                value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <Select value={filters.setor_id} onValueChange={v => setFilters(f => ({ ...f, setor_id: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Setores</SelectItem>
                {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={v => setFilters(f => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Nº Série</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map((equip: any) => (
                  <TableRow key={equip.id}>
                    <TableCell className="font-medium">{equip.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{equip.numero_serie || "—"}</TableCell>
                    <TableCell>{(equip.setores as any)?.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[equip.status]}>{statusLabels[equip.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{equip.localizacao || "—"}</TableCell>
                    <TableCell>{equip.valor ? `R$ ${Number(equip.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(equip)}><Pencil className="w-4 h-4" /></Button>
                        {isAdmin && <Button variant="ghost" size="icon" onClick={() => handleDelete(equip.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {equipamentos.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum equipamento encontrado</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Equipamento" : "Novo Equipamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Nº Série</Label>
                <Input value={form.numero_serie} onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={form.setor_id} onValueChange={v => setForm(f => ({ ...f, setor_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input value={form.localizacao} onChange={e => setForm(f => ({ ...f, localizacao: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data Aquisição</Label>
                <Input type="date" value={form.data_aquisicao} onChange={e => setForm(f => ({ ...f, data_aquisicao: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending || updateMut.isPending}>Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
