
-- 1. Tabela de conferências (uma por OS)
CREATE TABLE public.conferencias_chegada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  conferente_nome text,
  status text NOT NULL DEFAULT 'pendente',
  observacoes_finais text,
  finalizada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conferencias_ordem ON public.conferencias_chegada(ordem_id);
CREATE INDEX idx_conferencias_token ON public.conferencias_chegada(token);

-- 2. Itens da conferência
CREATE TABLE public.conferencia_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id uuid NOT NULL REFERENCES public.conferencias_chegada(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL,
  conferido boolean NOT NULL DEFAULT false,
  metodo_conferencia text,
  observacao text,
  conferido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_conf_itens_conferencia ON public.conferencia_itens(conferencia_id);

-- 3. Trigger updated_at
CREATE TRIGGER update_conferencias_updated_at
BEFORE UPDATE ON public.conferencias_chegada
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Função: gerar token aleatório curto
CREATE OR REPLACE FUNCTION public.gen_conferencia_token()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 5. Função: criar conferência + itens automaticamente após inserir ordem_equipamentos
-- (chamada por trigger AFTER INSERT em ordens_servico)
CREATE OR REPLACE FUNCTION public.create_conferencia_for_ordem()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  novo_token text;
  conf_id uuid;
BEGIN
  -- gerar token único (retry até 5x se colisão)
  FOR i IN 1..5 LOOP
    novo_token := public.gen_conferencia_token();
    BEGIN
      INSERT INTO public.conferencias_chegada (ordem_id, token)
      VALUES (NEW.id, novo_token)
      RETURNING id INTO conf_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_conferencia_after_ordem
AFTER INSERT ON public.ordens_servico
FOR EACH ROW EXECUTE FUNCTION public.create_conferencia_for_ordem();

-- 6. Função para sincronizar itens da conferência quando ordem_equipamentos muda
CREATE OR REPLACE FUNCTION public.sync_conferencia_itens()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conf_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT id INTO conf_id FROM public.conferencias_chegada WHERE ordem_id = NEW.ordem_id LIMIT 1;
    IF conf_id IS NOT NULL THEN
      INSERT INTO public.conferencia_itens (conferencia_id, equipamento_id)
      VALUES (conf_id, NEW.equipamento_id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT id INTO conf_id FROM public.conferencias_chegada WHERE ordem_id = OLD.ordem_id LIMIT 1;
    IF conf_id IS NOT NULL THEN
      DELETE FROM public.conferencia_itens
      WHERE conferencia_id = conf_id AND equipamento_id = OLD.equipamento_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_conferencia_itens
AFTER INSERT OR DELETE ON public.ordem_equipamentos
FOR EACH ROW EXECUTE FUNCTION public.sync_conferencia_itens();

-- 7. RLS
ALTER TABLE public.conferencias_chegada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conferencia_itens ENABLE ROW LEVEL SECURITY;

-- Admin: tudo
CREATE POLICY "Admins all conferencias" ON public.conferencias_chegada
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins all conferencia_itens" ON public.conferencia_itens
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff: ver/alterar conferências do próprio setor
CREATE POLICY "Staff view own setor conferencias" ON public.conferencias_chegada
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id = conferencias_chegada.ordem_id
      AND os.setor_id = get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update own setor conferencias" ON public.conferencias_chegada
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ordens_servico os
    WHERE os.id = conferencias_chegada.ordem_id
      AND os.setor_id = get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff view own setor conferencia_itens" ON public.conferencia_itens
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conferencias_chegada c
    JOIN public.ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_itens.conferencia_id
      AND os.setor_id = get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update own setor conferencia_itens" ON public.conferencia_itens
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conferencias_chegada c
    JOIN public.ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_itens.conferencia_id
      AND os.setor_id = get_user_setor(auth.uid())
  ));

-- 8. Backfill: criar conferências para OS já existentes
DO $$
DECLARE
  r record;
  novo_token text;
  conf_id uuid;
BEGIN
  FOR r IN SELECT id FROM public.ordens_servico WHERE id NOT IN (SELECT ordem_id FROM public.conferencias_chegada)
  LOOP
    novo_token := public.gen_conferencia_token();
    INSERT INTO public.conferencias_chegada (ordem_id, token)
    VALUES (r.id, novo_token)
    RETURNING id INTO conf_id;

    INSERT INTO public.conferencia_itens (conferencia_id, equipamento_id)
    SELECT conf_id, equipamento_id FROM public.ordem_equipamentos WHERE ordem_id = r.id;
  END LOOP;
END $$;
