-- Reanexar triggers de sincronização (se sumiram) e tornar a função sync mais robusta

-- 1) Função sync mais segura: cria a conferência se ainda não existir
CREATE OR REPLACE FUNCTION public.sync_conferencia_itens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conf_id uuid;
  v_empresa uuid;
  novo_token text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO conf_id FROM public.conferencias_chegada WHERE ordem_id = NEW.ordem_id LIMIT 1;
    IF conf_id IS NULL THEN
      SELECT empresa_id INTO v_empresa FROM public.ordens_servico WHERE id = NEW.ordem_id;
      FOR i IN 1..5 LOOP
        novo_token := public.gen_conferencia_token();
        BEGIN
          INSERT INTO public.conferencias_chegada (ordem_id, token, empresa_id)
          VALUES (NEW.ordem_id, novo_token, v_empresa)
          ON CONFLICT (ordem_id) DO NOTHING
          RETURNING id INTO conf_id;
          IF conf_id IS NOT NULL THEN EXIT; END IF;
          SELECT id INTO conf_id FROM public.conferencias_chegada WHERE ordem_id = NEW.ordem_id LIMIT 1;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          CONTINUE;
        END;
      END LOOP;
    END IF;
    IF conf_id IS NOT NULL THEN
      INSERT INTO public.conferencia_itens (conferencia_id, equipamento_id, empresa_id)
      VALUES (conf_id, NEW.equipamento_id, NEW.empresa_id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT id INTO conf_id FROM public.conferencias_chegada WHERE ordem_id = OLD.ordem_id LIMIT 1;
    IF conf_id IS NOT NULL THEN
      DELETE FROM public.conferencia_itens
      WHERE conferencia_id = conf_id
        AND equipamento_id = OLD.equipamento_id
        AND is_avulso = false;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 2) Garantir que os triggers existem
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

-- 3) Backfill final: garantir conferência para toda OS e itens para todo equipamento vinculado
DO $$
DECLARE
  os_rec RECORD;
  novo_token text;
BEGIN
  FOR os_rec IN
    SELECT os.id, os.empresa_id FROM public.ordens_servico os
    LEFT JOIN public.conferencias_chegada c ON c.ordem_id = os.id
    WHERE c.id IS NULL
  LOOP
    FOR i IN 1..5 LOOP
      novo_token := public.gen_conferencia_token();
      BEGIN
        INSERT INTO public.conferencias_chegada (ordem_id, token, empresa_id)
        VALUES (os_rec.id, novo_token, os_rec.empresa_id)
        ON CONFLICT (ordem_id) DO NOTHING;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        CONTINUE;
      END;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO public.conferencia_itens (conferencia_id, equipamento_id, empresa_id)
SELECT c.id, oe.equipamento_id, oe.empresa_id
FROM public.ordem_equipamentos oe
JOIN public.conferencias_chegada c ON c.ordem_id = oe.ordem_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.conferencia_itens ci
  WHERE ci.conferencia_id = c.id
    AND ci.equipamento_id = oe.equipamento_id
    AND ci.is_avulso = false
)
ON CONFLICT DO NOTHING;