import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getSpecFields, ESTADO_CONSERVACAO_LABELS, ESTADO_CONSERVACAO_COLORS } from "@/lib/equipSpecs";
import { ImageOff, Wrench, FileText, Calendar } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamento: any | null;
}

export function EquipDetailsDrawer({ open, onOpenChange, equipamento }: Props) {
  const eqId = equipamento?.id;

  const { data: ordens = [] } = useQuery({
    queryKey: ["equip-history-ordens", eqId],
    enabled: !!eqId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("ordem_equipamentos")
        .select("quantidade, ordens_servico(numero, cliente, data_saida, data_retorno_prevista, status)")
        .eq("equipamento_id", eqId)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  const { data: manutencoes = [] } = useQuery({
    queryKey: ["equip-history-manut", eqId],
    enabled: !!eqId && open,
    queryFn: async () => {
      const { data } = await supabase
        .from("manutencao")
        .select("tipo_reparo, descricao, data_inicio, data_conclusao")
        .eq("equipamento_id", eqId)
        .order("data_inicio", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  if (!equipamento) return null;

  const specs = getSpecFields(equipamento.categoria);
  const specValues = (equipamento.especificacoes || {}) as Record<string, any>;
  const estado = equipamento.estado_conservacao || "bom";

  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl p-0">
        <ScrollArea className="h-screen">
          <div className="p-6 space-y-5">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl">{equipamento.nome}</SheetTitle>
              <SheetDescription>
                {equipamento.marca} {equipamento.modelo} · {equipamento.categoria || "Sem categoria"}
              </SheetDescription>
            </SheetHeader>

            {/* Foto */}
            <div className="aspect-video w-full rounded-lg bg-muted overflow-hidden flex items-center justify-center">
              {equipamento.foto_url ? (
                <img src={equipamento.foto_url} alt={equipamento.nome} className="w-full h-full object-contain" />
              ) : (
                <div className="text-muted-foreground flex flex-col items-center gap-1">
                  <ImageOff className="w-8 h-8" />
                  <span className="text-xs">Sem foto</span>
                </div>
              )}
            </div>

            {/* Badges status */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className={ESTADO_CONSERVACAO_COLORS[estado]}>
                Conservação: {ESTADO_CONSERVACAO_LABELS[estado] || estado}
              </Badge>
              {equipamento.setores?.nome && (
                <Badge variant="outline">Setor: {equipamento.setores.nome}</Badge>
              )}
            </div>

            <Separator />

            {/* Identificação */}
            <section>
              <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">Identificação</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="Nº Série" value={equipamento.numero_serie} />
                <Field label="Nº Patrimônio" value={equipamento.numero_patrimonio} />
                <Field label="Cód. Barras" value={equipamento.codigo_barras} mono />
                <Field label="Localização" value={equipamento.localizacao} />
                <Field label="Aquisição" value={fmtDate(equipamento.data_aquisicao)} />
                <Field label="Valor" value={equipamento.valor ? `R$ ${Number(equipamento.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : null} />
              </dl>
            </section>

            {/* Especificações */}
            {specs.length > 0 && (
              <>
                <Separator />
                <section>
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">Especificações Técnicas</h3>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {specs.map((f) => (
                      <Field
                        key={f.key}
                        label={f.label}
                        value={specValues[f.key] ? `${specValues[f.key]}${f.suffix ? " " + f.suffix : ""}` : null}
                      />
                    ))}
                  </dl>
                </section>
              </>
            )}

            {/* Manutenção */}
            <Separator />
            <section>
              <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">Manutenção & Revisão</h3>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <Field label="Última revisão" value={fmtDate(equipamento.data_ultima_revisao)} />
                <Field label="Próxima revisão" value={fmtDate(equipamento.proxima_revisao)} />
              </dl>
              {equipamento.acessorios && (
                <div className="mt-3 text-sm">
                  <div className="text-muted-foreground text-xs mb-1">Acessórios inclusos</div>
                  <p className="whitespace-pre-wrap">{equipamento.acessorios}</p>
                </div>
              )}
            </section>

            {equipamento.observacoes && (
              <>
                <Separator />
                <section>
                  <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide">Observações</h3>
                  <p className="text-sm whitespace-pre-wrap">{equipamento.observacoes}</p>
                </section>
              </>
            )}

            {/* Histórico OS */}
            <Separator />
            <section>
              <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Últimas Ordens de Serviço
              </h3>
              {ordens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <ul className="space-y-2">
                  {ordens.map((o: any, i: number) => (
                    <li key={i} className="text-sm flex items-center justify-between border rounded-md px-3 py-2">
                      <div>
                        <div className="font-medium">OS #{o.ordens_servico?.numero} · {o.ordens_servico?.cliente}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {fmtDate(o.ordens_servico?.data_saida)} → {fmtDate(o.ordens_servico?.data_retorno_prevista)}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">{o.ordens_servico?.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Histórico Manutenção */}
            <section>
              <h3 className="font-semibold text-sm mb-2 text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Wrench className="w-3.5 h-3.5" /> Histórico de Manutenção
              </h3>
              {manutencoes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem registros.</p>
              ) : (
                <ul className="space-y-2">
                  {manutencoes.map((m: any, i: number) => (
                    <li key={i} className="text-sm border rounded-md px-3 py-2">
                      <div className="font-medium">{m.tipo_reparo}</div>
                      {m.descricao && <p className="text-xs text-muted-foreground">{m.descricao}</p>}
                      <div className="text-xs text-muted-foreground mt-1">
                        {fmtDate(m.data_inicio)} {m.data_conclusao ? `→ ${fmtDate(m.data_conclusao)}` : "(em andamento)"}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : ""}>{value || "—"}</dd>
    </>
  );
}
