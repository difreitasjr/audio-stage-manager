import { useEffect, useState } from "react";
import { Check, CreditCard, ExternalLink, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAssinatura } from "@/hooks/useAssinatura";
import { Navigate } from "react-router-dom";

// ============================================================
// COLE AQUI OS LINKS DE CHECKOUT DA CAKTO (após criar produtos)
// ============================================================
const CAKTO_LINKS = {
  mensal: "https://pay.cakto.com.br/SEU-LINK-MENSAL",
  semestral: "https://pay.cakto.com.br/SEU-LINK-SEMESTRAL",
  anual: "https://pay.cakto.com.br/SEU-LINK-ANUAL",
};

const planos = [
  {
    id: "mensal",
    nome: "Mensal",
    preco: 149,
    periodo: "/mês",
    economia: null,
    destaque: false,
    features: [
      "Equipamentos ilimitados",
      "Ordens de serviço ilimitadas",
      "Múltiplos setores e usuários",
      "Conferências por QR Code",
      "Relatórios completos",
      "Suporte por e-mail",
    ],
  },
  {
    id: "semestral",
    nome: "Semestral",
    preco: 759,
    periodo: "/6 meses",
    equivalente: "R$ 126,50/mês",
    economia: "Economize 15%",
    destaque: false,
    features: [
      "Tudo do plano Mensal",
      "Equivalente a R$ 126,50/mês",
      "1 mês grátis no total",
      "Suporte prioritário",
    ],
  },
  {
    id: "anual",
    nome: "Anual",
    preco: 1199,
    periodo: "/ano",
    equivalente: "R$ 99,92/mês",
    economia: "Economize 33%",
    destaque: true,
    features: [
      "Tudo do plano Mensal",
      "Equivalente a R$ 99,92/mês",
      "4 meses grátis no total",
      "Suporte prioritário",
      "Onboarding personalizado",
    ],
  },
];

interface Pagamento {
  id: string;
  criado_em: string;
  tipo_evento: string;
  status: string;
  valor: number | null;
  metodo: string | null;
  plano: string | null;
}

const fmtMoney = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusBadge = (s: string) => {
  if (/approved|paid|completed|success|active|renewed/i.test(s))
    return <Badge className="bg-green-600">Aprovado</Badge>;
  if (/refused|failed|declined/i.test(s))
    return <Badge variant="destructive">Falhou</Badge>;
  if (/cancel|expired|refund/i.test(s))
    return <Badge variant="secondary">Cancelado</Badge>;
  return <Badge variant="outline">{s}</Badge>;
};

export default function Assinatura() {
  const { profile, isAdmin } = useAuth();
  const { empresa, diasRestantesTrial, bannerStatus, loading } = useAssinatura();
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loadingPg, setLoadingPg] = useState(true);

  useEffect(() => {
    document.title = "Assinatura — AV Control";
  }, []);

  useEffect(() => {
    if (!profile?.empresa_id) return;
    (async () => {
      setLoadingPg(true);
      const { data } = await supabase
        .from("pagamentos")
        .select("id,criado_em,tipo_evento,status,valor,metodo,plano")
        .eq("empresa_id", profile.empresa_id)
        .order("criado_em", { ascending: false })
        .limit(50);
      setPagamentos((data as Pagamento[]) ?? []);
      setLoadingPg(false);
    })();
  }, [profile?.empresa_id]);

  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const checkoutUrl = (plano: string) => {
    const base = CAKTO_LINKS[plano as keyof typeof CAKTO_LINKS];
    if (!profile?.empresa_id) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}external_id=${profile.empresa_id}`;
  };

  const isAtiva = empresa?.status_assinatura === "ativa";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano e veja o histórico de pagamentos.
        </p>
      </div>

      {/* Status atual */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Status da assinatura
              </CardTitle>
            </div>
            {isAtiva ? (
              <Badge className="bg-green-600">Ativa</Badge>
            ) : empresa?.status_assinatura === "trial" ? (
              <Badge className="bg-blue-600">Trial</Badge>
            ) : empresa?.status_assinatura === "atrasada" ? (
              <Badge variant="destructive">Atrasada</Badge>
            ) : (
              <Badge variant="secondary">{empresa?.status_assinatura}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-muted-foreground">Plano atual</div>
            <div className="text-lg font-semibold capitalize">{empresa?.plano ?? "—"}</div>
          </div>
          {bannerStatus === "trial" || bannerStatus === "trial-aviso" ? (
            <div>
              <div className="text-sm text-muted-foreground">Trial termina em</div>
              <div className="text-lg font-semibold">
                {diasRestantesTrial} dia{diasRestantesTrial === 1 ? "" : "s"}
              </div>
            </div>
          ) : (
            <div>
              <div className="text-sm text-muted-foreground">Próxima cobrança</div>
              <div className="text-lg font-semibold">
                {empresa?.assinatura_proxima_cobranca
                  ? new Date(empresa.assinatura_proxima_cobranca).toLocaleDateString("pt-BR")
                  : "—"}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm text-muted-foreground">Empresa</div>
            <div className="text-lg font-semibold">{empresa?.nome}</div>
          </div>
        </CardContent>
      </Card>

      {/* Planos */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {isAtiva ? "Trocar de plano" : "Escolha seu plano"}
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {planos.map((p) => {
            const ativoAtual = isAtiva && empresa?.plano === p.id;
            return (
              <Card
                key={p.id}
                className={`relative ${
                  p.destaque
                    ? "border-primary border-2 shadow-xl shadow-primary/20"
                    : ""
                }`}
              >
                {p.destaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1">
                    <Crown className="w-3 h-3" /> Mais escolhido
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {p.nome}
                    {p.economia && (
                      <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300">
                        {p.economia}
                      </Badge>
                    )}
                  </CardTitle>
                  <div className="mt-2">
                    <span className="text-4xl font-extrabold">R$ {p.preco}</span>
                    <span className="text-muted-foreground">{p.periodo}</span>
                  </div>
                  {p.equivalente && (
                    <div className="text-xs text-muted-foreground">{p.equivalente}</div>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    className="w-full"
                    variant={p.destaque ? "default" : "outline"}
                    disabled={ativoAtual}
                  >
                    {ativoAtual ? (
                      <span>Plano atual</span>
                    ) : (
                      <a href={checkoutUrl(p.id)} target="_blank" rel="noopener noreferrer">
                        Assinar <ExternalLink className="w-4 h-4 ml-2" />
                      </a>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Pagamento processado com segurança pela Cakto. O acesso é liberado automaticamente após a confirmação.
        </p>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingPg ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : pagamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Nenhum pagamento registrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="py-2 font-medium">Data</th>
                    <th className="py-2 font-medium">Plano</th>
                    <th className="py-2 font-medium">Valor</th>
                    <th className="py-2 font-medium">Método</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-3">
                        {new Date(p.criado_em).toLocaleString("pt-BR")}
                      </td>
                      <td className="py-3 capitalize">{p.plano ?? "—"}</td>
                      <td className="py-3">{fmtMoney(p.valor)}</td>
                      <td className="py-3">{p.metodo ?? "—"}</td>
                      <td className="py-3">{statusBadge(p.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
