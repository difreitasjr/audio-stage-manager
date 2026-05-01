import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useEquipamentos, useCreateEquipamento, useUpdateEquipamento, useDeleteEquipamento, findEquipamentoByCode } from "@/hooks/useEquipamentos";
import { useSetores } from "@/hooks/useSetores";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Download, ScanLine, QrCode, Eye, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { ScannerDialog } from "@/components/ScannerDialog";
import { QrLabelDialog } from "@/components/QrLabelDialog";
import { EquipDetailsDrawer } from "@/components/EquipDetailsDrawer";
import { getSpecFields, ESTADO_CONSERVACAO_LABELS, ESTADO_CONSERVACAO_COLORS } from "@/lib/equipSpecs";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<string, string> = {
  disponivel: "Disponível", em_uso: "Em Uso", danificado: "Danificado", manutencao: "Manutenção",
};
const statusColors: Record<string, string> = {
  disponivel: "bg-green-100 text-green-800", em_uso: "bg-blue-100 text-blue-800",
  danificado: "bg-red-100 text-red-800", manutencao: "bg-yellow-100 text-yellow-800",
};

interface CustomField {
  label: string;
  valor: string;
}

interface EquipForm {
  nome: string; numero_serie: string; setor_id: string; status: string;
  observacoes: string;
  marca: string; modelo: string; categoria: string; codigo_barras: string;
  estado_conservacao: string;
  numero_patrimonio: string;
  data_ultima_revisao: string;
  proxima_revisao: string;
  acessorios: string;
  foto_url: string;
  voltagem: string;
  peso_kg: string;
  dimensoes: string;
  potencia_w: string;
  especificacoes: Record<string, any>;
  custom_fields: CustomField[];
}

const emptyForm: EquipForm = {
  nome: "", numero_serie: "", setor_id: "", status: "disponivel",
  observacoes: "",
  marca: "", modelo: "", categoria: "", codigo_barras: "",
  estado_conservacao: "bom",
  numero_patrimonio: "",
  data_ultima_revisao: "",
  proxima_revisao: "",
  acessorios: "",
  foto_url: "",
  voltagem: "",
  peso_kg: "",
  dimensoes: "",
  potencia_w: "",
  especificacoes: {},
  custom_fields: [],
};

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

const setorKey = (nome: string): string => {
  const n = nome.toLowerCase().trim();
  if (n.includes("som")) return "som";
  if (n.includes("luz")) return "luz";
  if (n.includes("vídeo") || n.includes("video")) return "video";
  if (n.includes("stream")) return "streaming";
  return "";
};

const FIXED_SPEC_KEYS = ["voltagem", "peso_kg", "dimensoes", "potencia_w", "descricao", "_custom"];

export default function Equipamentos() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [filters, setFilters] = useState({ setor_id: "", status: "", search: "", conservacao: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EquipForm>(emptyForm);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [labelEquip, setLabelEquip] = useState<any | null>(null);
  const [detailsEquip, setDetailsEquip] = useState<any | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [novoSetorOpen, setNovoSetorOpen] = useState(false);
  const [novoSetorNome, setNovoSetorNome] = useState("");

  const activeFilters = {
    setor_id: filters.setor_id || undefined,
    status: filters.status || undefined,
    search: filters.search || undefined,
  };
  const { data: equipamentosRaw = [], isLoading } = useEquipamentos(activeFilters);
  const equipamentos = filters.conservacao
    ? equipamentosRaw.filter((e: any) => (e.estado_conservacao || "bom") === filters.conservacao)
    : equipamentosRaw;
  const { data: setores = [] } = useSetores();
  const createMut = useCreateEquipamento();
  const updateMut = useUpdateEquipamento();
  const deleteMut = useDeleteEquipamento();

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (e: any) => {
    const especs = (e.especificacoes || {}) as Record<string, any>;
    // Custom fields = anything stored in especs._custom (array)
    const custom_fields: CustomField[] = Array.isArray(especs._custom) ? especs._custom : [];
    setEditId(e.id);
    setForm({
      nome: e.nome, numero_serie: e.numero_serie || "", setor_id: e.setor_id, status: e.status,
      observacoes: e.observacoes || "",
      marca: e.marca || "", modelo: e.modelo || "", categoria: e.categoria || "",
      codigo_barras: e.codigo_barras || "",
      estado_conservacao: e.estado_conservacao || "bom",
      numero_patrimonio: e.numero_patrimonio || "",
      data_ultima_revisao: e.data_ultima_revisao || "",
      proxima_revisao: e.proxima_revisao || "",
      acessorios: e.acessorios || "",
      foto_url: e.foto_url || "",
      voltagem: especs.voltagem || "",
      peso_kg: especs.peso_kg || "",
      dimensoes: especs.dimensoes || "",
      potencia_w: especs.potencia_w || "",
      especificacoes: especs,
      custom_fields,
    });
    setDialogOpen(true);
  };

  const handlePhotoUpload = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("equipamento-fotos").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("equipamento-fotos").getPublicUrl(path);
      setForm((f) => ({ ...f, foto_url: data.publicUrl }));
      toast.success("Foto enviada!");
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleCriarSetor = async () => {
    if (!novoSetorNome.trim()) return;
    const { data, error } = await supabase.from("setores").insert({ nome: novoSetorNome.trim() } as any).select().single();
    if (error) {
      toast.error(error.message || "Erro ao criar setor");
      return;
    }
    qc.invalidateQueries({ queryKey: ["setores"] });
    setForm((f) => ({ ...f, setor_id: data.id, categoria: "", nome: "" }));
    setNovoSetorOpen(false);
    setNovoSetorNome("");
    toast.success(`Setor "${data.nome}" criado!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.setor_id) {
      toast.error("Nome e Setor são obrigatórios");
      return;
    }
    if (!form.observacoes.trim()) {
      toast.error("Descrição/Observações é obrigatório");
      return;
    }

    // Merge especificações: campos predefinidos por categoria já estão em form.especificacoes,
    // adicionamos os fixos (voltagem etc) e os custom.
    const merged: Record<string, any> = { ...form.especificacoes };
    if (form.voltagem) merged.voltagem = form.voltagem;
    if (form.peso_kg) merged.peso_kg = form.peso_kg;
    if (form.dimensoes) merged.dimensoes = form.dimensoes;
    if (form.potencia_w) merged.potencia_w = form.potencia_w;
    if (form.custom_fields.length > 0) {
      merged._custom = form.custom_fields.filter(c => c.label.trim() && c.valor.trim());
    } else {
      delete merged._custom;
    }

    const payload: any = {
      nome: form.nome, numero_serie: form.numero_serie || undefined,
      setor_id: form.setor_id, status: form.status,
      observacoes: form.observacoes,
      marca: form.marca || undefined, modelo: form.modelo || undefined,
      categoria: form.categoria || undefined,
      codigo_barras: form.codigo_barras || undefined,
      estado_conservacao: form.estado_conservacao,
      numero_patrimonio: form.numero_patrimonio || undefined,
      data_ultima_revisao: form.data_ultima_revisao || null,
      proxima_revisao: form.proxima_revisao || null,
      acessorios: form.acessorios || undefined,
      foto_url: form.foto_url || null,
      especificacoes: merged,
    };
    if (editId) await updateMut.mutateAsync({ id: editId, ...payload });
    else await createMut.mutateAsync(payload);
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
    const headers = ["Nome", "Marca", "Modelo", "Categoria", "Nº Série", "Patrimônio", "Cód. Barras", "Setor", "Status", "Conservação", "Valor"];
    const rows = equipamentos.map((e: any) => [
      e.nome, e.marca || "", e.modelo || "", e.categoria || "",
      e.numero_serie || "", e.numero_patrimonio || "", e.codigo_barras || "",
      (e.setores as any)?.nome || "", statusLabels[e.status],
      ESTADO_CONSERVACAO_LABELS[e.estado_conservacao || "bom"], e.valor || "",
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

  const selectedSetor = setores.find((s: any) => s.id === form.setor_id);
  const sKey = selectedSetor ? setorKey(selectedSetor.nome) : "";
  const categoriasPreset = sKey && PRESETS[sKey] ? Object.keys(PRESETS[sKey]) : [];
  const nomesPreset = sKey && form.categoria && PRESETS[sKey]?.[form.categoria] ? PRESETS[sKey][form.categoria] : [];
  const specFields = getSpecFields(form.categoria);

  const addCustomField = () => {
    setForm((f) => ({ ...f, custom_fields: [...f.custom_fields, { label: "", valor: "" }] }));
  };
  const updateCustomField = (idx: number, key: "label" | "valor", v: string) => {
    setForm((f) => ({
      ...f,
      custom_fields: f.custom_fields.map((c, i) => i === idx ? { ...c, [key]: v } : c),
    }));
  };
  const removeCustomField = (idx: number) => {
    setForm((f) => ({ ...f, custom_fields: f.custom_fields.filter((_, i) => i !== idx) }));
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
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
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
            <Select value={filters.conservacao} onValueChange={(v) => setFilters((f) => ({ ...f, conservacao: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Conservação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda Conservação</SelectItem>
                {Object.entries(ESTADO_CONSERVACAO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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
                  <TableHead>Setor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conservação</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipamentos.map((equip: any) => (
                  <TableRow key={equip.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {equip.foto_url && (
                          <img src={equip.foto_url} alt="" className="w-8 h-8 rounded object-cover bg-muted" />
                        )}
                        {equip.nome}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {equip.marca || equip.modelo ? `${equip.marca || ""} ${equip.modelo || ""}`.trim() : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{equip.categoria || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{equip.numero_serie || "—"}</TableCell>
                    <TableCell>{(equip.setores as any)?.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[equip.status]}>{statusLabels[equip.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={ESTADO_CONSERVACAO_COLORS[equip.estado_conservacao || "bom"]}>
                        {ESTADO_CONSERVACAO_LABELS[equip.estado_conservacao || "bom"]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {equip.valor ? `R$ ${Number(equip.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setDetailsEquip(equip)} title="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </Button>
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
                <Label>Setor *</Label>
                <Select
                  value={form.setor_id}
                  onValueChange={(v) => {
                    if (v === "__novo__") {
                      setNovoSetorOpen(true);
                      return;
                    }
                    setForm((f) => ({ ...f, setor_id: v, categoria: "", nome: "" }));
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {setores.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    {isAdmin && (
                      <SelectItem value="__novo__" className="text-primary font-medium">
                        + Criar novo setor…
                      </SelectItem>
                    )}
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
                    <Input list="categorias-list" value={form.categoria}
                      onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value, nome: "", especificacoes: {} }))}
                      placeholder="Selecione ou digite livremente" />
                    <datalist id="categorias-list">
                      {categoriasPreset.map((c) => <option key={c} value={c} />)}
                    </datalist>
                  </>
                ) : (
                  <Input value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value, especificacoes: {} }))} placeholder="Digite a categoria livremente" />
                )}
                <p className="text-xs text-muted-foreground">Você pode digitar qualquer categoria — usada para agrupar relatórios.</p>
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                {nomesPreset.length > 0 ? (
                  <>
                    <Input list="nomes-list" value={form.nome}
                      onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                      placeholder="Selecione ou digite" required />
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
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Nº Série</Label>
                <Input value={form.numero_serie} onChange={(e) => setForm((f) => ({ ...f, numero_serie: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Nº Patrimônio</Label>
                <Input value={form.numero_patrimonio} onChange={(e) => setForm((f) => ({ ...f, numero_patrimonio: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Código de Barras</Label>
                <Input value={form.codigo_barras} onChange={(e) => setForm((f) => ({ ...f, codigo_barras: e.target.value }))} placeholder="EAN/Code128" />
              </div>
            </div>

            {/* Descrição obrigatória */}
            <div className="space-y-2">
              <Label>Descrição / Observações *</Label>
              <Textarea
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                rows={3}
                required
                placeholder="Descreva o equipamento, características, condição, etc."
              />
            </div>

            {/* Foto */}
            <div className="space-y-2">
              <Label>Foto</Label>
              {form.foto_url ? (
                <div className="relative inline-block">
                  <img src={form.foto_url} alt="" className="w-32 h-32 object-cover rounded border" />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={() => setForm((f) => ({ ...f, foto_url: "" }))}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center w-full h-24 border-2 border-dashed rounded-md cursor-pointer hover:bg-muted/50 transition">
                  <div className="text-center text-sm text-muted-foreground">
                    <Upload className="w-5 h-5 mx-auto mb-1" />
                    {uploadingPhoto ? "Enviando..." : "Clique para enviar foto"}
                  </div>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto}
                    onChange={(e) => e.target.files?.[0] && handlePhotoUpload(e.target.files[0])} />
                </label>
              )}
            </div>

            {/* Especificações fixas (sempre visíveis) */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm">Especificações (gerais)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voltagem</Label>
                  <Select value={form.voltagem} onValueChange={(v) => setForm((f) => ({ ...f, voltagem: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="110V">110V</SelectItem>
                      <SelectItem value="220V">220V</SelectItem>
                      <SelectItem value="Bivolt">Bivolt</SelectItem>
                      <SelectItem value="12V DC">12V DC</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Potência (W)</Label>
                  <Input type="number" value={form.potencia_w} onChange={(e) => setForm((f) => ({ ...f, potencia_w: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Peso (kg)</Label>
                  <Input type="number" step="0.01" value={form.peso_kg} onChange={(e) => setForm((f) => ({ ...f, peso_kg: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Dimensões (CxLxA cm)</Label>
                  <Input value={form.dimensoes} onChange={(e) => setForm((f) => ({ ...f, dimensoes: e.target.value }))} placeholder="Ex: 50x30x20" />
                </div>
              </div>
            </div>

            {/* Especificações Técnicas dinâmicas por categoria */}
            {specFields.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-sm">Especificações Técnicas (categoria)</h4>
                <div className="grid grid-cols-2 gap-4">
                  {specFields.map((field) => (
                    <div key={field.key} className="space-y-2">
                      <Label>{field.label}{field.suffix ? ` (${field.suffix})` : ""}</Label>
                      {field.type === "select" ? (
                        <Select
                          value={form.especificacoes[field.key] || ""}
                          onValueChange={(v) => setForm((f) => ({ ...f, especificacoes: { ...f.especificacoes, [field.key]: v } }))}
                        >
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {field.options?.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          value={form.especificacoes[field.key] || ""}
                          onChange={(e) => setForm((f) => ({ ...f, especificacoes: { ...f.especificacoes, [field.key]: e.target.value } }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Campos personalizados */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Campos personalizados</h4>
                <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                  <Plus className="w-3 h-3 mr-1" />Adicionar campo
                </Button>
              </div>
              {form.custom_fields.length === 0 && (
                <p className="text-xs text-muted-foreground">Adicione campos extras conforme sua necessidade (ex: cor, número da nota, lote).</p>
              )}
              {form.custom_fields.map((cf, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input placeholder="Nome do campo" value={cf.label} onChange={(e) => updateCustomField(idx, "label", e.target.value)} />
                  <Input placeholder="Valor" value={cf.valor} onChange={(e) => updateCustomField(idx, "valor", e.target.value)} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCustomField(idx)}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Conservação e Manutenção */}
            <div className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-sm">Conservação e Manutenção</h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Estado de Conservação</Label>
                  <Select value={form.estado_conservacao} onValueChange={(v) => setForm((f) => ({ ...f, estado_conservacao: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ESTADO_CONSERVACAO_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Última Revisão</Label>
                  <Input type="date" value={form.data_ultima_revisao} onChange={(e) => setForm((f) => ({ ...f, data_ultima_revisao: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Próxima Revisão</Label>
                  <Input type="date" value={form.proxima_revisao} onChange={(e) => setForm((f) => ({ ...f, proxima_revisao: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Acessórios inclusos</Label>
                <Textarea value={form.acessorios} onChange={(e) => setForm((f) => ({ ...f, acessorios: e.target.value }))}
                  rows={2} placeholder="Ex: case, cabo de força, controle remoto..." />
              </div>
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

      {/* Dialog: criar novo setor */}
      <Dialog open={novoSetorOpen} onOpenChange={(o) => { setNovoSetorOpen(o); if (!o) setNovoSetorNome(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar novo setor</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleCriarSetor(); }} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do setor *</Label>
              <Input
                autoFocus
                value={novoSetorNome}
                onChange={(e) => setNovoSetorNome(e.target.value)}
                placeholder="Ex: Tradução simultânea, Energia, Cenografia..."
                required
              />
              <p className="text-xs text-muted-foreground">Ficará disponível para todos os usuários.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setNovoSetorOpen(false)}>Cancelar</Button>
              <Button type="submit">Criar setor</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onScan={handleScan} title="Escanear equipamento" />
      <QrLabelDialog open={!!labelEquip} onOpenChange={(v) => !v && setLabelEquip(null)} equipamento={labelEquip} />
      <EquipDetailsDrawer open={!!detailsEquip} onOpenChange={(v) => !v && setDetailsEquip(null)} equipamento={detailsEquip} />
    </div>
  );
}
