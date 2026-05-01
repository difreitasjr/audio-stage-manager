-- Adicionar FK faltante entre conferencia_itens.equipamento_id e equipamentos.id
ALTER TABLE public.conferencia_itens
  ADD CONSTRAINT conferencia_itens_equipamento_id_fkey
  FOREIGN KEY (equipamento_id) REFERENCES public.equipamentos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_conferencia_itens_equipamento
  ON public.conferencia_itens(equipamento_id);