import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrdens(filters?: { status?: string; setor_id?: string; search?: string }) {
  return useQuery({
    queryKey: ["ordens", filters],
    queryFn: async () => {
      let query = supabase.from("ordens_servico")
        .select("*, setores(nome), ordem_equipamentos(id, equipamento_id, equipamentos(nome))")
        .order("created_at", { ascending: false });
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.setor_id) query = query.eq("setor_id", filters.setor_id);
      if (filters?.search) query = query.or(`cliente.ilike.%${filters.search}%,local_evento.ilike.%${filters.search}%,responsavel_nome.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      ordem: {
        data_saida: string; data_retorno_prevista: string; responsavel_nome: string;
        setor_id: string; cliente: string; contato_cliente?: string; local_evento?: string;
        descricao_servico?: string; observacoes?: string;
        checklist_funciona?: boolean; checklist_acessorios?: boolean; checklist_completo?: boolean;
      };
      equipamento_ids: string[];
    }) => {
      const { data: ordem, error: ordemError } = await supabase
        .from("ordens_servico").insert(data.ordem as any).select().single();
      if (ordemError) throw ordemError;

      if (data.equipamento_ids.length > 0) {
        const items = data.equipamento_ids.map(eid => ({ ordem_id: ordem.id, equipamento_id: eid }));
        const { error: itemError } = await supabase.from("ordem_equipamentos").insert(items);
        if (itemError) throw itemError;

        await supabase.from("equipamentos")
          .update({ status: "em_uso" })
          .in("id", data.equipamento_ids);
      }
      return ordem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Ordem de serviço criada!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRetornarOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordemId: string) => {
      const { data: items } = await supabase.from("ordem_equipamentos")
        .select("equipamento_id").eq("ordem_id", ordemId);

      await supabase.from("ordens_servico").update({ status: "retornado" }).eq("id", ordemId);

      if (items && items.length > 0) {
        const ids = items.map(i => i.equipamento_id);
        await supabase.from("equipamentos").update({ status: "disponivel" }).in("id", ids);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("Ordem marcada como retornada!");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
