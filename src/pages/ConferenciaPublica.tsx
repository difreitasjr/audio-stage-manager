import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ScanLine, Loader2, Package } from "lucide-react";
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

export default function ConferenciaPublica() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [conf, setConf] = useState<any>(null);
  const [ordem, setOrdem] = useState<any>(null);
  const [itens, setItens] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finalizando, setFinalizando] = useState(false);

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

  const marcar = async (equipamento_id: string | null, codigoVal?: string, metodo: string = "manual") => {
    try {
      const body: any = { token, metodo };
      if (equipamento_id) body.equipamento_id = equipamento_id;
      if (codigoVal) body.codigo = codigoVal;
      await callFn(`/conferencia-mark-item`, { method: "POST", body: JSON.stringify(body) });
      toast.success("Item conferido!");
      setCodigo("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const finalizar = async () => {
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

        {!concluida && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex gap-2">
                <Input
                  value={codigo}
                  onChange={e => setCodigo(e.target.value)}
                  placeholder="Digite código de barras / nº série / patrimônio"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (codigo.trim()) marcar(null, codigo.trim(), "codigo"); } }}
                />
                <Button onClick={() => codigo.trim() && marcar(null, codigo.trim(), "codigo")}>OK</Button>
                <Button variant="outline" onClick={() => setScannerOpen(true)}><ScanLine className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-2">
          {itens.map((it) => (
            <Card key={it.id} className={it.conferido ? "border-green-500/40 bg-green-50/50" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                {it.equipamentos?.foto_url ? (
                  <img src={it.equipamentos.foto_url} alt="" className="w-12 h-12 rounded object-cover bg-muted" />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{it.equipamentos?.nome}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {it.equipamentos?.marca} {it.equipamentos?.modelo}
                    {it.equipamentos?.numero_serie ? ` · SN ${it.equipamentos.numero_serie}` : ""}
                  </div>
                  {it.conferido && it.conferido_em && (
                    <div className="text-xs text-green-700">✓ Conferido às {new Date(it.conferido_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ({it.metodo_conferencia})</div>
                  )}
                </div>
                {!concluida && (
                  it.conferido ? (
                    <Button size="sm" variant="ghost" onClick={() => marcar(it.equipamento_id, undefined, "manual")} title="Re-marcar">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => marcar(it.equipamento_id, undefined, "manual")}>Conferir</Button>
                  )
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {!concluida && (
          <Button className="w-full" size="lg" onClick={finalizar} disabled={finalizando}>
            {finalizando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Finalizar conferência ({conferidos}/{total})
          </Button>
        )}

        <ScannerDialog
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={(c) => marcar(null, c, "qrcode")}
          title="Escanear equipamento"
        />
      </div>
    </div>
  );
}
