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
  observacoes: string;
  marca: string; modelo: string; categoria: string; codigo_barras: string;
}

const emptyForm: EquipForm = {
  nome: "", numero_serie: "", setor_id: "", status: "disponivel",
  observacoes: "",
  marca: "", modelo: "", categoria: "", codigo_barras: "",
};

// Presets por setor: categoria -> lista de equipamentos comuns
const PRESETS: Record<string, Record<string, string[]>> = {
  video: {
    "Projetor": ["Epson PowerLite 5000lm", "Epson PowerLite 7000lm", "Epson Pro L1100U", "Optoma ZU720", "Panasonic PT-RZ970"],
    "Tela de Projeção": ["Tela Tripé 100\"", "Tela Retrátil 120\"", "Tela Fast-Fold 200\"", "Tela Fast-Fold 300\""],
    "Painel de LED": ["Painel LED P2.6 Indoor", "Painel LED P3.9 Indoor/Outdoor", "Painel LED P4.8 Outdoor", "Módulo LED Absen"],
    "Monitor/TV": ["TV LED 55\"", "TV LED 65\"", "TV LED 75\"", "Monitor de Referência 24\""],
    "Câmera": ["Sony PXW-Z150", "Panasonic AG-CX10", "Blackmagic Pocket 6K", "PTZ Sony SRG-X120"],
    "Switcher/Processador": ["Blackmagic ATEM Mini Pro", "Roland V-1HD", "Processador Novastar MCTRL4K"],
    "Cabos e Conversores": ["Cabo HDMI 10m", "Cabo HDMI 20m", "Cabo SDI 30m", "Conversor HDMI-SDI", "Fibra Óptica HDMI 50m"],
  },
  som: {
    "Microfone": ["Shure SM58", "Shure Beta 58A", "Sennheiser e835", "Lapela Sennheiser EW112", "Headset Sennheiser HSP4", "Microfone Gooseneck"],
    "Sistema Sem Fio": ["Shure BLX24", "Shure QLX-D", "Sennheiser EW100 G4", "Sennheiser EW500"],
    "Mesa de Som": ["Behringer X32", "Yamaha QL5", "Allen & Heath SQ-6", "Soundcraft Ui24R"],
    "Caixa Acústica": ["Line Array RCF HDL 20-A", "JBL VRX932", "EV ETX-15P", "Subwoofer JBL SRX828SP"],
    "Monitor de Retorno": ["Monitor JBL EON612", "Monitor de Palco Behringer"],
    "Acessórios": ["Pedestal de Microfone", "Direct Box Behringer DI100", "Cabo XLR 10m", "Multicabo 16 vias"],
  },
  luz: {
    "Iluminação de Palco": ["Moving Head Beam 230", "Moving Head Spot 350", "Refletor LED Par 64", "Fresnel LED 200W"],
    "Iluminação Cênica": ["Elipsoidal LED 26°", "Elipsoidal LED 36°", "Setlight LED 1000W"],
    "Mesa de Luz": ["Mesa Avolites Quartz", "Mesa GrandMA3 OnPC", "Console Chamsys MagicQ"],
    "Estrutura": ["Treliça Q30 3m", "Box Truss 2m", "Talha Manual 1T", "Base de Solo"],
    "Efeitos": ["Máquina de Fumaça 1500W", "Máquina de Haze", "Strobo LED"],
  },
  streaming: {
    "Câmera de Streaming": ["Logitech BRIO 4K", "Sony ZV-E10", "Câmera PTZ OBSBOT Tail Air", "Webcam Logitech C920"],
    "Captura/Encoder": ["Elgato Cam Link 4K", "Blackmagic Web Presenter HD", "Encoder Teradek VidiU Go"],
    "Switcher de Streaming": ["ATEM Mini Pro ISO", "ATEM Mini Extreme", "vMix PC Dedicado"],
    "Áudio para Streaming": ["Interface Focusrite Scarlett 2i2", "RodeCaster Pro II", "Microfone USB Blue Yeti"],
    "Conectividade": ["Roteador 4G/5G Bonding", "Switch Gigabit 8 portas", "Cabo Ethernet Cat6 30m"],
    "Iluminação Stream": ["Ring Light 18\"", "Painel LED Godox SL60", "Softbox 60x60"],
  },
};

// Normaliza nome do setor para chave do preset
const setorKey = (nome: string): string => {
  const n = nome.toLowerCase().trim();
  if (n.includes("som")) return "som";
  if (n.includes("luz")) return "luz";
  if (n.includes("vídeo") || n.includes("video")) return "video";
  if (n.includes("stream")) return "streaming";
  return "";
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
      observacoes: e.observacoes || "",
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
    const escape = (v: any) => {
      let s = String(v ?? "");
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
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
          {(() => {
            const selectedSetor = setores.find((s: any) => s.id === form.setor_id);
            const sKey = selectedSetor ? setorKey(selectedSetor.nome) : "";
            const categoriasPreset = sKey && PRESETS[sKey] ? Object.keys(PRESETS[sKey]) : [];
            const nomesPreset = sKey && form.categoria && PRESETS[sKey]?.[form.categoria] ? PRESETS[sKey][form.categoria] : [];
            return (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor *</Label>
                <Select value={form.setor_id} onValueChange={(v) => setForm((f) => ({ ...f, setor_id: v, categoria: "", nome: "" }))}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                {categoriasPreset.length > 0 ? (
                  <>
                    <Input
                      list="categorias-list"
                      value={form.categoria}
                      onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value, nome: "" }))}
                      placeholder="Selecione ou digite"
                    />
                    <datalist id="categorias-list">
                      {categoriasPreset.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </>
                ) : (
                  <Input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))} placeholder="Selecione setor primeiro" disabled={!form.setor_id} />
                )}
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                {nomesPreset.length > 0 ? (
                  <>
                    <Input
                      list="nomes-list"
                      value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      placeholder="Selecione ou digite"
                      required
                    />
                    <datalist id="nomes-list">
                      {nomesPreset.map((n) => <option key={n} value={n} />)}
                    </datalist>
                  </>
                ) : (
                  <Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} required placeholder={form.setor_id ? "Digite o nome" : "Selecione setor primeiro"} />
                )}
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
            );
          })()}
        </DialogContent>
      </Dialog>

      <ScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} title="Escanear equipamento" />
      <QrLabelDialog open={!!labelEquip} onOpenChange={(v) => !v && setLabelEquip(null)} equipamento={labelEquip} />
    </div>
  );
}
