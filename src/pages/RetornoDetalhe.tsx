import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  useConferenciaRetorno, useUpdateItemRetorno, useFinalizarRetorno, DestinoRetorno,
} from "@/hooks/useConferenciasRetorno";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { ArrowLeft, CheckCircle2, AlertTriangle, Wrench, XCircle, Clock } from "lucide-react";

const destinoMeta: Record<DestinoRetorno, { label: string; color: string; icon: any }> = {
  disponivel:   { label: "Disponível",  color: "bg-green-100 text-green-700",   icon: CheckCircle2 },
  manutencao:   { label: "Manutenção",  color: "bg-orange-100 text-orange-700", icon: Wrench },
  danificado:   { label: "Danificado",  color: "bg-red-100 text-red-700",       icon: XCircle },
  pendente:     { label: "Pendente",    color: "bg-gray-100 text-gray-700",     icon: Clock },
};

export default function RetornoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useConferenciaRetorno(id);
  const updateItem = useUpdateItemRetorno();
  const finalizar = useFinalizarRetorno();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [obsFinal, setObsFinal] = useState("");

  const itens = data?.itens || [];
  const conferencia = data?.conferencia;
  const ordem = conferencia?.ordens_servico as any;

  const counts = useMemo(() => {
    const c: Record<DestinoRetorno, number> = { disponivel: 0, manutencao: 0, danificado: 0, pendente: 0 };
    itens.forEach((i: any) => { c[i.destino as DestinoRetorno] = (c[i.destino as DestinoRetorno] || 0) + 1; });
    return c;
  }, [itens]);

  const todosConferidos = itens.length > 0 && itens.every((i: any) => i.conferido);
  const finalizada = conferencia?.status === "finalizada";

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Carregando…</div>;
  if (!conferencia) return <div className="p-8 text-center text-muted-foreground">Conferência não encontrada</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/retornos")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Conferência de Retorno - OS #{ordem?.numero}</h1>
          <p className="text-sm text-muted-foreground">{ordem?.cliente} · {ordem?.setores?.nome}</p>
        </div>
        {finalizada && <Badge className="bg-green-100 text-green-700">Finalizada</Badge>}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {(Object.keys(destinoMeta) as DestinoRetorno[]).map(k => {
          const M = destinoMeta[k];
          return (
            <Card key={k}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${M.color}`}>
                  <M.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{counts[k]}</p>
                  <p className="text-xs text-muted-foreground">{M.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itens da OS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item nesta OS.</p>}
          {itens.map((it: any) => {
            const eq = it.equipamentos;
            const M = destinoMeta[it.destino as DestinoRetorno];
            const obsObrig = it.destino === "manutencao" || it.destino === "danificado";
            return (
              <div key={it.id} className={`border rounded-lg p-4 ${it.conferido ? "bg-muted/30" : ""}`}>
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-medium">{eq?.nome || it.nome_avulso || "Item"}</p>
                    <p className="text-xs text-muted-foreground">
                      {[eq?.marca, eq?.modelo].filter(Boolean).join(" · ")}
                      {eq?.numero_serie && ` · S/N ${eq.numero_serie}`}
                    </p>
                  </div>
                  <Badge className={M.color}>{M.label}</Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Qtd esperada / conferida</label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{it.quantidade_esperada}</span>
                      <span className="text-muted-foreground">/</span>
                      <Input
                        type="number" min={0} max={it.quantidade_esperada}
                        value={it.quantidade_conferida}
                        disabled={finalizada}
                        onChange={e => updateItem.mutate({ id: it.id, quantidade_conferida: Number(e.target.value) })}
                        className="w-20 h-8"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Destino</label>
                    <Select
                      value={it.destino}
                      disabled={finalizada}
                      onValueChange={(v) => updateItem.mutate({ id: it.id, destino: v as DestinoRetorno })}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="disponivel">Disponibilizar no estoque</SelectItem>
                        <SelectItem value="manutencao">Enviar para manutenção</SelectItem>
                        <SelectItem value="danificado">Marcar como danificado</SelectItem>
                        <SelectItem value="pendente">Deixar pendente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant={it.conferido ? "secondary" : "default"}
                      size="sm" className="w-full"
                      disabled={finalizada}
                      onClick={() => updateItem.mutate({ id: it.id, conferido: !it.conferido })}
                    >
                      {it.conferido ? "Conferido ✓" : "Marcar conferido"}
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-xs text-muted-foreground">
                    Observação {obsObrig && <span className="text-red-600">*</span>}
                  </label>
                  <Textarea
                    rows={2}
                    placeholder={obsObrig ? "Descreva o problema/reparo necessário" : "Opcional"}
                    value={it.observacao || ""}
                    disabled={finalizada}
                    onChange={e => updateItem.mutate({ id: it.id, observacao: e.target.value })}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {!finalizada && (
        <div className="flex items-center justify-between gap-3 sticky bottom-0 bg-background/95 backdrop-blur p-3 border rounded-lg">
          <div className="text-sm text-muted-foreground">
            {todosConferidos
              ? <span className="text-green-700 font-medium flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>Todos os itens foram conferidos</span>
              : <span className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-yellow-600"/>Marque todos os itens antes de finalizar</span>}
          </div>
          <Button
            disabled={!todosConferidos || finalizar.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            Finalizar conferência
          </Button>
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar conferência?</DialogTitle>
            <DialogDescription>
              Os equipamentos serão atualizados no estoque conforme o destino escolhido. Itens marcados como pendente
              ficarão em aberto e a OS continuará ativa.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Observações finais (opcional)"
            value={obsFinal}
            onChange={e => setObsFinal(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button
              disabled={finalizar.isPending}
              onClick={() => finalizar.mutate(
                { conferencia_id: id!, observacoes: obsFinal || undefined },
                { onSuccess: () => { setConfirmOpen(false); navigate("/retornos"); } }
              )}
            >
              Confirmar e dar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
