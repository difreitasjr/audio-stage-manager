import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEquipamentos(filters?: { setor_id?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["equipamentos", filters],
    queryFn: async () => {
      let query = supabase.from("equipamentos").select("*, setores(nome)").order("nome");
      if (filters?.setor_id) query = query.eq("setor_id", filters.setor_id);
      if (filters?.status) query = query.eq("status", filters.status);
      if (filters?.search) query = query.or(`nome.ilike.%${filters.search}%,numero_serie.ilike.%${filters.search}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      nome: string; numero_serie?: string; setor_id: string; status?: string;
      localizacao?: string; data_aquisicao?: string; valor?: number; observacoes?: string;
    }) => {
      const { error } = await supabase.from("equipamentos").insert(data);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipamentos"] }); toast.success("Equipamento criado!"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; nome?: string; numero_serie?: string; setor_id?: string; status?: string; localizacao?: string; data_aquisicao?: string; valor?: number; observacoes?: string }) => {
      const { error } = await supabase.from("equipamentos").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipamentos"] }); toast.success("Equipamento atualizado!"); },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteEquipamento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("equipamentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["equipamentos"] }); toast.success("Equipamento excluído!"); },
    onError: (e: any) => toast.error(e.message),
  });
}
