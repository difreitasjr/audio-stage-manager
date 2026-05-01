import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DestinoRetorno = "disponivel" | "manutencao" | "danificado" | "pendente";

export function useConferenciasRetorno(filters?: { status?: string; setor_id?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["conferencias_retorno", filters],
    queryFn: async () => {
      let q = supabase
        .from("conferencias_retorno")
        .select("*, ordens_servico(id, numero, cliente, setor_id, data_retorno_prevista, status, setores(nome))")
        .order("created_at", { ascending: false });
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.from) q = q.gte("created_at", filters.from);
      if (filters?.to) q = q.lte("created_at", filters.to);
      const { data, error } = await q;
      if (error) throw error;
      let rows = data || [];
      if (filters?.setor_id) {
        rows = rows.filter((r: any) => r.ordens_servico?.setor_id === filters.setor_id);
      }
      return rows;
    },
  });
}

export function useConferenciaRetorno(id: string | undefined) {
  return useQuery({
    queryKey: ["conferencia_retorno", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: conf, error } = await supabase
        .from("conferencias_retorno")
        .select("*, ordens_servico(id, numero, cliente, contato_cliente, local_evento, data_saida, data_retorno_prevista, setor_id, setores(nome))")
        .eq("id", id!)
        .single();
      if (error) throw error;
      const { data: itens, error: e2 } = await supabase
        .from("conferencia_retorno_itens")
        .select("*, equipamentos(id, nome, marca, modelo, numero_serie, codigo_barras)")
        .eq("conferencia_id", id!)
        .order("created_at", { ascending: true });
      if (e2) throw e2;
      return { conferencia: conf, itens: itens || [] };
    },
  });
}

export function useIniciarRetorno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordem_id: string) => {
      const { data, error } = await supabase.rpc("iniciar_conferencia_retorno", { _ordem_id: ordem_id });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conferencias_retorno"] });
      qc.invalidateQueries({ queryKey: ["ordens"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao iniciar conferência"),
  });
}

export function useUpdateItemRetorno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      destino?: DestinoRetorno;
      quantidade_conferida?: number;
      observacao?: string | null;
      conferido?: boolean;
    }) => {
      const { id, ...rest } = payload;
      const update: any = { ...rest };
      if (rest.conferido) {
        update.conferido_em = new Date().toISOString();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) update.conferido_por = user.id;
      }
      const { error } = await supabase
        .from("conferencia_retorno_itens")
        .update(update)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["conferencia_retorno"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar item"),
  });
}

export function useFinalizarRetorno() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { conferencia_id: string; observacoes?: string }) => {
      const { error } = await supabase.rpc("finalizar_conferencia_retorno", {
        _conf_id: payload.conferencia_id,
        _observacoes: payload.observacoes ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conferência finalizada e estoque atualizado");
      qc.invalidateQueries({ queryKey: ["conferencias_retorno"] });
      qc.invalidateQueries({ queryKey: ["conferencia_retorno"] });
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      qc.invalidateQueries({ queryKey: ["movimentacao"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao finalizar conferência"),
  });
}
