import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AssinaturaInfo {
  id: string;
  nome: string;
  plano: string;
  status_assinatura: string;
  trial_inicio: string | null;
  trial_fim: string | null;
  assinatura_inicio: string | null;
  assinatura_proxima_cobranca: string | null;
}

export type BannerStatus =
  | "ok"
  | "trial"
  | "trial-aviso"
  | "trial-expirado"
  | "atrasada"
  | "cancelada";

export interface AssinaturaState {
  loading: boolean;
  empresa: AssinaturaInfo | null;
  diasRestantesTrial: number;
  temAcesso: boolean;
  bannerStatus: BannerStatus;
  reload: () => Promise<void>;
}

export function useAssinatura(): AssinaturaState {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [empresa, setEmpresa] = useState<AssinaturaInfo | null>(null);

  const load = async () => {
    if (!profile?.empresa_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("empresas")
      .select(
        "id,nome,plano,status_assinatura,trial_inicio,trial_fim,assinatura_inicio,assinatura_proxima_cobranca"
      )
      .eq("id", profile.empresa_id)
      .maybeSingle();
    setEmpresa((data as AssinaturaInfo) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.empresa_id]);

  let diasRestantesTrial = 0;
  let temAcesso = false;
  let bannerStatus: BannerStatus = "ok";

  if (empresa) {
    const now = new Date();
    const trialFim = empresa.trial_fim ? new Date(empresa.trial_fim) : null;
    if (trialFim) {
      diasRestantesTrial = Math.max(
        0,
        Math.ceil((trialFim.getTime() - now.getTime()) / 86400000)
      );
    }
    const trialValido =
      empresa.status_assinatura === "trial" && trialFim && trialFim > now;
    const ativa = empresa.status_assinatura === "ativa";
    temAcesso = !!(trialValido || ativa);

    if (ativa) bannerStatus = "ok";
    else if (empresa.status_assinatura === "atrasada") bannerStatus = "atrasada";
    else if (empresa.status_assinatura === "cancelada") bannerStatus = "cancelada";
    else if (trialValido) bannerStatus = diasRestantesTrial <= 2 ? "trial-aviso" : "trial";
    else bannerStatus = "trial-expirado";
  }

  return { loading, empresa, diasRestantesTrial, temAcesso, bannerStatus, reload: load };
}
