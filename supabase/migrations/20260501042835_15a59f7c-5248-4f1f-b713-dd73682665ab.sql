
-- 1) Deduplicar conferencia_itens dentro de cada conferência (mesmo equipamento_id)
-- Mantém a linha "melhor": conferido=true tem prioridade, depois a mais antiga.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY conferencia_id, equipamento_id
           ORDER BY conferido DESC, created_at ASC
         ) AS rn
  FROM public.conferencia_itens
  WHERE equipamento_id IS NOT NULL AND is_avulso = false
)
DELETE FROM public.conferencia_itens
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2) Deduplicar conferencias_chegada (mesma ordem_id)
-- Para cada ordem, escolhemos a conferência "principal" (a mais antiga).
-- Antes de deletar as outras, movemos seus itens para a principal (com ON CONFLICT DO NOTHING).
WITH principal AS (
  SELECT DISTINCT ON (ordem_id) ordem_id, id AS keep_id
  FROM public.conferencias_chegada
  ORDER BY ordem_id, created_at ASC
)
UPDATE public.conferencia_itens ci
SET conferencia_id = p.keep_id
FROM principal p, public.conferencias_chegada c
WHERE ci.conferencia_id = c.id
  AND c.ordem_id = p.ordem_id
  AND c.id <> p.keep_id
  -- só move se não existir já um item equivalente na conferência principal
  AND NOT EXISTS (
    SELECT 1 FROM public.conferencia_itens ci2
    WHERE ci2.conferencia_id = p.keep_id
      AND ci2.equipamento_id IS NOT DISTINCT FROM ci.equipamento_id
      AND ci2.is_avulso = ci.is_avulso
  );

-- Apaga itens órfãos que sobraram nas conferências duplicadas (já existem na principal)
DELETE FROM public.conferencia_itens ci
USING public.conferencias_chegada c,
      (SELECT DISTINCT ON (ordem_id) ordem_id, id AS keep_id
       FROM public.conferencias_chegada
       ORDER BY ordem_id, created_at ASC) p
WHERE ci.conferencia_id = c.id
  AND c.ordem_id = p.ordem_id
  AND c.id <> p.keep_id;

-- Apaga as conferências duplicadas
DELETE FROM public.conferencias_chegada c
USING (SELECT DISTINCT ON (ordem_id) ordem_id, id AS keep_id
       FROM public.conferencias_chegada
       ORDER BY ordem_id, created_at ASC) p
WHERE c.ordem_id = p.ordem_id
  AND c.id <> p.keep_id;

-- 3) Índices únicos para impedir novas duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS uniq_conferencia_ordem
  ON public.conferencias_chegada(ordem_id);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_conferencia_item_equip
  ON public.conferencia_itens(conferencia_id, equipamento_id)
  WHERE is_avulso = false AND equipamento_id IS NOT NULL;

-- 4) Função de criação de conferência: idempotente
CREATE OR REPLACE FUNCTION public.create_conferencia_for_ordem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  novo_token text;
  conf_id uuid;
BEGIN
  -- Se já existe conferência para essa OS, não faz nada
  SELECT id INTO conf_id FROM public.conferencias_chegada WHERE ordem_id = NEW.id LIMIT 1;
  IF conf_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  FOR i IN 1..5 LOOP
    novo_token := public.gen_conferencia_token();
    BEGIN
      INSERT INTO public.conferencias_chegada (ordem_id, token)
      VALUES (NEW.id, novo_token)
      ON CONFLICT (ordem_id) DO NOTHING
      RETURNING id INTO conf_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- colisão de token — tenta de novo
      CONTINUE;
    END;
  END LOOP;
  RETURN NEW;
END;
$function$;

-- 5) (Re)anexar triggers
DROP TRIGGER IF EXISTS trg_create_conferencia_for_ordem ON public.ordens_servico;
CREATE TRIGGER trg_create_conferencia_for_ordem
  AFTER INSERT ON public.ordens_servico
  FOR EACH ROW EXECUTE FUNCTION public.create_conferencia_for_ordem();

DROP TRIGGER IF EXISTS trg_sync_conferencia_itens_ins ON public.ordem_equipamentos;
CREATE TRIGGER trg_sync_conferencia_itens_ins
  AFTER INSERT ON public.ordem_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.sync_conferencia_itens();

DROP TRIGGER IF EXISTS trg_sync_conferencia_itens_del ON public.ordem_equipamentos;
CREATE TRIGGER trg_sync_conferencia_itens_del
  AFTER DELETE ON public.ordem_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.sync_conferencia_itens();
