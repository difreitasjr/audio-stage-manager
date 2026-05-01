import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, ScanLine, Loader2, Package, Plus, Trash2, X, Undo2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ScannerDialog } from "@/components/ScannerDialog";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

async function callFn(path: string, init?: RequestInit) {
  const res = await fetch(`${FN_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Erro ${res.status}`);
  return data;
}

// Heurística simples: parece código (sem espaços, contém dígito ou tem ≥6 chars alfanuméricos)
function looksLikeCode(s: string) {
  const v = s.trim();
  if (!v || /\s/.test(v)) return false;
  if (/\d/.test(v) && v.length >= 3) return true;
  if (/^[A-Za-z0-9-_]{6,}$/.test(v)) return true;
  return false;
}

export default function ConferenciaPublica() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [conf, setConf] = useState<any>(null);
  const [ordem, setOrdem] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [busca, setBusca] = useState("");
  const buscaInputRef = useRef<HTMLInputElement>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);

  // Múltiplos matches por nome
  const [multiMatches, setMultiMatches] = useState<any[] | null>(null);

  // Dialog de item avulso
  const [avulsoOpen, setAvulsoOpen] = useState(false);
  const [avulsoNome, setAvulsoNome] = useState("");
  const [avulsoObs, setAvulsoObs] = useState("");
  const [avulsoLoading, setAvulsoLoading] = useState(false);

  const load = async () => {
    if (!token) return;
    try {
      const data = await callFn(`/conferencia-get?token=${encodeURIComponent(token)}`);
      setConf(data.conferencia);
      setOrdem(data.ordem);
      setItens(data.itens || []);
      if (data.conferencia?.conferente_nome) setNome(data.conferencia.conferente_nome);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]);

  const setConferente = async () => {
    if (!nome.trim()) return toast.error("Informe seu nome");
    try {
      await callFn(`/conferencia-set-conferente`, { method: "POST", body: JSON.stringify({ token, nome }) });
      toast.success("Conferência iniciada");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // Marca por equipamento_id direto (botão "Conferir" na lista, ou seleção do dialog de matches)
  const marcarPorId = async (equipamento_id: string, metodo: string = "manual") => {
    try {
      await callFn(`/conferencia-mark-item`, {
        method: "POST",
        body: JSON.stringify({ token, equipamento_id, metodo }),
      });
      toast.success("Item conferido!");
      setMultiMatches(null);
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // Desconfere um item (caso tenha tiquetado o errado)
  const desmarcarPorId = async (equipamento_id: string) => {
    try {
      await callFn(`/conferencia-mark-item`, {
        method: "POST",
        body: JSON.stringify({ token, equipamento_id, conferido: false, metodo: "manual" }),
      });
      toast.success("Item desmarcado");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  // Submete o input principal (código OU nome)
  const submeterBusca = async (override?: string) => {
    const valor = (override ?? busca).trim();
    if (!valor) return;
    try {
      const body: any = { token };
      if (looksLikeCode(valor)) {
        body.codigo = valor;
        body.metodo = "codigo";
      } else {
        body.nome = valor;
      }
      const resp = await callFn(`/conferencia-mark-item`, { method: "POST", body: JSON.stringify(body) });
      if (resp?.multiple && Array.isArray(resp.matches)) {
        setMultiMatches(resp.matches);
        return;
      }
      toast.success("Item conferido!");
      setBusca("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const onScan = async (codigoLido: string) => {
    try {
      await callFn(`/conferencia-mark-item`, {
        method: "POST",
        body: JSON.stringify({ token, codigo: codigoLido, metodo: "qrcode" }),
      });
      toast.success("Item conferido!");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const adicionarAvulso = async () => {
    if (avulsoNome.trim().length < 2) return toast.error("Digite o nome do equipamento");
    setAvulsoLoading(true);
    try {
      await callFn(`/conferencia-mark-item`, {
        method: "POST",
        body: JSON.stringify({
          token,
          avulso: true,
          nome: avulsoNome.trim(),
          observacao: avulsoObs.trim() || undefined,
        }),
      });
      toast.success("Item avulso adicionado");
      setAvulsoOpen(false);
      setAvulsoNome("");
      setAvulsoObs("");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setAvulsoLoading(false); }
  };

  const removerAvulso = async (item_id: string) => {
    if (!confirm("Remover este item avulso da conferência?")) return;
    try {
      await callFn(`/conferencia-remove-item`, {
        method: "POST",
        body: JSON.stringify({ token, item_id }),
      });
      toast.success("Item removido");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const finalizar = async () => {
    const pendentes = itens.filter((i) => !i.conferido).length;
    if (itens.length === 0) {
      toast.error("Não há itens para conferir nesta ordem.");
      return;
    }
    if (pendentes > 0) {
      toast.error(
        `Faltam ${pendentes} ${pendentes === 1 ? "item" : "itens"} para conferir. A conferência continuará em aberto.`
      );
      return;
    }
    setFinalizando(true);
    try {
      await callFn(`/conferencia-finalizar`, { method: "POST", body: JSON.stringify({ token }) });
      toast.success("Conferência finalizada!");
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setFinalizando(false); }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (error || !conf) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full"><CardContent className="p-6 text-center">
          <p className="text-destructive">{error || "Conferência não encontrada"}</p>
        </CardContent></Card>
      </div>
    );
  }

  const conferidos = itens.filter(i => i.conferido).length;
  const total = itens.length;
  const concluida = conf.status === "concluida";

  // Etapa 1: pedir nome
  if (!conf.conferente_nome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-2">
              <Package className="w-6 h-6 text-primary-foreground" />
            </div>
            <CardTitle>Conferência de Chegada</CardTitle>
            <p className="text-sm text-muted-foreground">OS #{ordem?.numero} — {ordem?.cliente}</p>
            <p className="text-xs text-muted-foreground">Setor: {ordem?.setores?.nome}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Seu nome *</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do conferente" />
            </div>
            <Button onClick={setConferente} className="w-full">Iniciar conferência</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-lg">OS #{ordem?.numero} — {ordem?.cliente}</CardTitle>
                <p className="text-xs text-muted-foreground">Local: {ordem?.local_evento || "—"} · Setor: {ordem?.setores?.nome}</p>
                <p className="text-xs text-muted-foreground">Conferente: <strong>{conf.conferente_nome}</strong></p>
              </div>
              {concluida && <Badge className="bg-green-100 text-green-800">Concluída</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Progresso</span>
              <span className="font-medium">{conferidos}/{total}</span>
            </div>
            <Progress value={total > 0 ? (conferidos / total) * 100 : 0} />
          </CardContent>
        </Card>

        {!concluida && (() => {
          const q = busca.trim().toLowerCase();
          const sugestoes = q.length >= 1 && !looksLikeCode(busca)
            ? itens.filter(i => !i.is_avulso && i.equipamentos?.nome &&
                String(i.equipamentos.nome).toLowerCase().includes(q)).slice(0, 8)
            : [];
          return (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="relative">
                  <div className="flex gap-2">
                    <Input
                      ref={buscaInputRef}
                      value={busca}
                      onChange={e => setBusca(e.target.value)}
                      placeholder="Código de barras, nº série, patrimônio ou nome do equipamento"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submeterBusca(); } }}
                      autoComplete="off"
                    />
                    <Button onClick={() => submeterBusca()}>OK</Button>
                    <Button variant="outline" onClick={() => setScannerOpen(true)} title="Escanear">
                      <ScanLine className="w-4 h-4" />
                    </Button>
                  </div>
                  {sugestoes.length > 0 && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-y-auto">
                      {sugestoes.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setBusca("");
                            marcarPorId(s.equipamento_id, "nome");
                            buscaInputRef.current?.focus();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-muted border-b last:border-b-0 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{s.equipamentos?.nome}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {s.equipamentos?.marca} {s.equipamentos?.modelo}
                              {s.equipamentos?.numero_serie ? ` · SN ${s.equipamentos.numero_serie}` : ""}
                            </div>
                          </div>
                          {s.conferido && <span className="text-xs text-green-700 shrink-0">✓ ok</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Digite código ou nome (ex.: "mesa", "cabo xlr"). Se não estiver na lista, use o botão abaixo.
                </p>
                <Button variant="secondary" className="w-full" onClick={() => setAvulsoOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar item avulso (não cadastrado)
                </Button>
              </CardContent>
            </Card>
          );
        })()}

        {itens.length === 0 && !concluida && (
          <Card className="border-dashed">
            <CardContent className="p-4 text-center text-sm text-muted-foreground">
              Nenhum equipamento vinculado encontrado. Se a OS já tinha equipamentos, recarregue a página. Você também pode usar <strong>"Adicionar item avulso"</strong> acima.
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {itens.map((it) => {
            const displayNome = it.is_avulso ? it.nome_avulso : it.equipamentos?.nome;
            const sub = it.is_avulso
              ? (it.observacao ? `Obs: ${it.observacao}` : "Item avulso")
              : `${it.equipamentos?.marca || ""} ${it.equipamentos?.modelo || ""}${it.equipamentos?.numero_serie ? ` · SN ${it.equipamentos.numero_serie}` : ""}`;
            const podeMarcar = !concluida && !it.is_avulso && !it.conferido;
            const handleToggle = () => {
              if (podeMarcar) marcarPorId(it.equipamento_id, "manual");
            };
            return (
              <Card
                key={it.id}
                onClick={handleToggle}
                className={`${it.conferido ? "border-green-500/40 bg-green-50/50" : ""} ${podeMarcar ? "cursor-pointer hover:bg-muted/40 active:bg-muted/60 transition" : ""}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  {!it.is_avulso && (
                    <Checkbox
                      checked={it.conferido}
                      disabled={concluida || it.conferido}
                      onCheckedChange={(v) => { if (v && podeMarcar) marcarPorId(it.equipamento_id, "manual"); }}
                      onClick={(e) => e.stopPropagation()}
                      className="h-6 w-6 shrink-0"
                      aria-label={`Conferir ${displayNome}`}
                    />
                  )}
                  {!it.is_avulso && it.equipamentos?.foto_url ? (
                    <img src={it.equipamentos.foto_url} alt="" className="w-12 h-12 rounded object-cover bg-muted" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm truncate">{displayNome}</div>
                      {it.is_avulso && <Badge variant="secondary" className="text-[10px]">Avulso</Badge>}
                      {it.conferido && !it.is_avulso && (
                        <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{sub}</div>
                    {it.conferido && it.conferido_em && (
                      <div className="text-xs text-green-700">
                        ✓ Conferido às {new Date(it.conferido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ({it.metodo_conferencia})
                      </div>
                    )}
                  </div>
                  {!concluida && it.is_avulso && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); removerAvulso(it.id); }}
                      title="Remover avulso"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!concluida && (() => {
          const faltam = total - conferidos;
          const completo = total > 0 && faltam === 0;
          return (
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={finalizar}
                disabled={finalizando || !completo}
                title={!completo ? `Faltam ${faltam} item(ns) para conferir` : ""}
              >
                {finalizando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {completo
                  ? `Finalizar conferência (${conferidos}/${total})`
                  : `Faltam ${faltam} ${faltam === 1 ? "item" : "itens"} para finalizar (${conferidos}/${total})`}
              </Button>
              {!completo && total > 0 && (
                <p className="text-xs text-center text-muted-foreground">
                  A conferência só pode ser concluída quando todos os itens forem conferidos.
                </p>
              )}
            </div>
          );
        })()}

        <ScannerDialog
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={(c) => onScan(c)}
          title="Escanear equipamento"
        />

        {/* Dialog: múltiplos matches por nome */}
        <Dialog open={!!multiMatches} onOpenChange={(o) => !o && setMultiMatches(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Vários equipamentos encontrados</DialogTitle>
              <DialogDescription>Toque no item correto para conferir.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(multiMatches || []).map((m) => (
                <button
                  key={m.item_id}
                  onClick={() => marcarPorId(m.equipamento_id, "nome")}
                  className="w-full text-left p-3 rounded-md border hover:bg-muted transition"
                >
                  <div className="font-medium text-sm">{m.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.marca} {m.modelo}{m.numero_serie ? ` · SN ${m.numero_serie}` : ""}
                  </div>
                  {m.conferido && <div className="text-xs text-green-700 mt-1">✓ Já conferido</div>}
                </button>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMultiMatches(null)}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: adicionar item avulso */}
        <Dialog open={avulsoOpen} onOpenChange={setAvulsoOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar item avulso</DialogTitle>
              <DialogDescription>
                Use para equipamentos que não estão cadastrados no sistema (sem QR code, série ou patrimônio).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome do equipamento *</Label>
                <Input
                  value={avulsoNome}
                  onChange={(e) => setAvulsoNome(e.target.value)}
                  placeholder='Ex.: "Cabo XLR 5m", "Tripé extra"'
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Observação (opcional)</Label>
                <Textarea
                  value={avulsoObs}
                  onChange={(e) => setAvulsoObs(e.target.value)}
                  placeholder="Detalhes, estado, etc."
                  maxLength={500}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAvulsoOpen(false)} disabled={avulsoLoading}>
                Cancelar
              </Button>
              <Button onClick={adicionarAvulso} disabled={avulsoLoading}>
                {avulsoLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-1" />}
                Adicionar e marcar como conferido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
