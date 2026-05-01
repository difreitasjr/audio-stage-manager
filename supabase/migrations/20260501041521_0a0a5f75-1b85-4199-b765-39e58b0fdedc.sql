-- 1. Anexar triggers que estavam faltando
DROP TRIGGER IF EXISTS trg_create_conferencia_for_ordem ON public.ordens_servico;
CREATE TRIGGER trg_create_conferencia_for_ordem
AFTER INSERT ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.create_conferencia_for_ordem();

DROP TRIGGER IF EXISTS trg_sync_conferencia_itens_ins ON public.ordem_equipamentos;
CREATE TRIGGER trg_sync_conferencia_itens_ins
AFTER INSERT ON public.ordem_equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.sync_conferencia_itens();

DROP TRIGGER IF EXISTS trg_sync_conferencia_itens_del ON public.ordem_equipamentos;
CREATE TRIGGER trg_sync_conferencia_itens_del
AFTER DELETE ON public.ordem_equipamentos
FOR EACH ROW
EXECUTE FUNCTION public.sync_conferencia_itens();

-- 2. Trigger updated_at em ordens_servico (não havia)
DROP TRIGGER IF EXISTS trg_ordens_updated_at ON public.ordens_servico;
CREATE TRIGGER trg_ordens_updated_at
BEFORE UPDATE ON public.ordens_servico
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Índice único para evitar duplicados de equipamento numa mesma OS
CREATE UNIQUE INDEX IF NOT EXISTS uniq_ordem_equipamento
ON public.ordem_equipamentos (ordem_id, equipamento_id);

-- 4. Backfill: criar conferência para qualquer OS sem uma
DO $$
DECLARE
  os_rec RECORD;
  novo_token text;
BEGIN
  FOR os_rec IN
    SELECT os.id FROM public.ordens_servico os
    LEFT JOIN public.conferencias_chegada c ON c.ordem_id = os.id
    WHERE c.id IS NULL
  LOOP
    FOR i IN 1..5 LOOP
      novo_token := public.gen_conferencia_token();
      BEGIN
        INSERT INTO public.conferencias_chegada (ordem_id, token, empresa_id)
        SELECT os_rec.id, novo_token, empresa_id
        FROM public.ordens_servico WHERE id = os_rec.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
END $$;

-- 5. Backfill: inserir em conferencia_itens qualquer ordem_equipamento ainda não refletido
INSERT INTO public.conferencia_itens (conferencia_id, equipamento_id, empresa_id)
SELECT c.id, oe.equipamento_id, oe.empresa_id
FROM public.ordem_equipamentos oe
JOIN public.conferencias_chegada c ON c.ordem_id = oe.ordem_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.conferencia_itens ci
  WHERE ci.conferencia_id = c.id
    AND ci.equipamento_id = oe.equipamento_id
    AND ci.is_avulso = false
);
