import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOrdens(filters?: { status?: string; setor_id?: string; search?: string }) {
  return useQuery({
    queryKey: ["ordens", filters],
    queryFn: async () => {
      let query = supabase.from("ordens_servico")
        .select("*, setores(nome), app_users(nome), ordem_equipamentos(id, equipamento_id, equipamentos(nome))")
        .order("created_at", { ascending: false });
      
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.setor_id) query = query.eq("setor_id", filters.setor_id);
      if (filters?.search) query = query.or(`cliente.ilike.%${filters.search}%,local_evento.ilike.%${filters.search}%`);
      
      const { data, error } = await query;
      if (error) {
        console.error("❌ Erro ao buscar ordens:", error);
        throw error;
      }
      return data || [];
    },
  });
}

export function useCreateOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      ordem: {
        numero_ordem?: string;
        data_saida: string;
        data_retorno_prevista: string;
        responsavel_id: string;
        setor_id: string;
        cliente: string;
        contato_cliente?: string;
        local_evento?: string;
        descricao_servico?: string;
        observacoes?: string;
        checklist_funciona?: boolean;
        checklist_acessorios?: boolean;
        checklist_completo?: boolean;
        status?: string;
      };
      equipamento_ids: string[];
    }) => {
      // Gerar número de ordem automaticamente
      const numeroOrdem = `OS-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const ordemData = {
        ...data.ordem,
        numero_ordem: numeroOrdem,
        status: "aberta",
      };

      const { data: ordem, error: ordemError } = await supabase
        .from("ordens_servico")
        .insert([ordemData])
        .select()
        .single();

      if (ordemError) {
        console.error("❌ Erro ao criar ordem:", ordemError);
        throw ordemError;
      }

      if (data.equipamento_ids.length > 0) {
        const items = data.equipamento_ids.map((eid) => ({
          ordem_id: ordem.id,
          equipamento_id: eid,
        }));

        const { error: itemError } = await supabase
          .from("ordem_equipamentos")
          .insert(items);

        if (itemError) {
          console.error("❌ Erro ao adicionar equipamentos:", itemError);
          throw itemError;
        }

        // Atualizar status dos equipamentos para "em_uso"
        const { error: updateError } = await supabase
          .from("equipamentos")
          .update({ status: "em_uso" })
          .in("id", data.equipamento_ids);

        if (updateError) {
          console.error("❌ Erro ao atualizar status dos equipamentos:", updateError);
          throw updateError;
        }
      }

      return ordem;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("✅ Ordem de serviço criada com sucesso!");
    },
    onError: (e: any) => {
      console.error("❌ Erro na mutação:", e);
      toast.error(e.message || "Erro ao criar ordem");
    },
  });
}

export function useRetornarOrdem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordemId: string) => {
      // Buscar equipamentos da ordem
      const { data: items, error: fetchError } = await supabase
        .from("ordem_equipamentos")
        .select("equipamento_id")
        .eq("ordem_id", ordemId);

      if (fetchError) {
        console.error("❌ Erro ao buscar equipamentos:", fetchError);
        throw fetchError;
      }

      // Atualizar status da ordem para "retornado"
      const { error: updateOrdemError } = await supabase
        .from("ordens_servico")
        .update({ status: "retornado" })
        .eq("id", ordemId);

      if (updateOrdemError) {
        console.error("❌ Erro ao atualizar ordem:", updateOrdemError);
        throw updateOrdemError;
      }

      // Atualizar status dos equipamentos para "disponivel"
      if (items && items.length > 0) {
        const ids = items.map((i) => i.equipamento_id);
        const { error: updateEquipError } = await supabase
          .from("equipamentos")
          .update({ status: "disponivel" })
          .in("id", ids);

        if (updateEquipError) {
          console.error("❌ Erro ao atualizar equipamentos:", updateEquipError);
          throw updateEquipError;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ordens"] });
      qc.invalidateQueries({ queryKey: ["equipamentos"] });
      toast.success("✅ Ordem marcada como retornada!");
    },
    onError: (e: any) => {
      console.error("❌ Erro na mutação:", e);
      toast.error(e.message || "Erro ao retornar ordem");
    },
  });
}
