import { Link } from "react-router-dom";
import { AlertTriangle, Clock, CreditCard, XCircle } from "lucide-react";
import { useAssinatura } from "@/hooks/useAssinatura";
import { useAuth } from "@/contexts/AuthContext";

export function AssinaturaBanner() {
  const { isAdmin } = useAuth();
  const { bannerStatus, diasRestantesTrial, empresa, loading } = useAssinatura();

  if (loading || !empresa) return null;
  if (bannerStatus === "ok") return null;

  const config = {
    trial: {
      icon: Clock,
      bg: "bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100",
      title: `Período de teste: ${diasRestantesTrial} dia${diasRestantesTrial === 1 ? "" : "s"} restante${diasRestantesTrial === 1 ? "" : "s"}`,
      msg: "Aproveite todos os recursos. Assine para continuar usando após o trial.",
      cta: "Ver planos",
    },
    "trial-aviso": {
      icon: AlertTriangle,
      bg: "bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-100",
      title: `Atenção: seu trial acaba em ${diasRestantesTrial} dia${diasRestantesTrial === 1 ? "" : "s"}`,
      msg: "Assine agora para não perder o acesso.",
      cta: "Assinar agora",
    },
    "trial-expirado": {
      icon: XCircle,
      bg: "bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-100",
      title: "Seu período de teste terminou",
      msg: "Você ainda pode acessar o sistema. Regularize sua assinatura para evitar interrupções.",
      cta: "Assinar",
    },
    atrasada: {
      icon: CreditCard,
      bg: "bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100",
      title: "Pagamento em atraso",
      msg: "Identificamos uma falha no pagamento. Regularize para evitar a suspensão da sua conta.",
      cta: "Regularizar",
    },
    cancelada: {
      icon: XCircle,
      bg: "bg-red-50 border-red-300 text-red-900 dark:bg-red-950 dark:border-red-700 dark:text-red-100",
      title: "Assinatura cancelada",
      msg: "Sua assinatura foi cancelada. Reative para continuar com acesso completo.",
      cta: "Reativar",
    },
  }[bannerStatus] as
    | { icon: any; bg: string; title: string; msg: string; cta: string }
    | undefined;

  if (!config) return null;
  const Icon = config.icon;

  return (
    <div className={`border-b ${config.bg}`}>
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
        <Icon className="w-4 h-4 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="font-semibold">{config.title}.</span>{" "}
          <span className="opacity-90">{config.msg}</span>
        </div>
        {isAdmin && (
          <Link
            to="/assinatura"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/80 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 font-semibold text-xs whitespace-nowrap transition"
          >
            {config.cta} →
          </Link>
        )}
      </div>
    </div>
  );
}
