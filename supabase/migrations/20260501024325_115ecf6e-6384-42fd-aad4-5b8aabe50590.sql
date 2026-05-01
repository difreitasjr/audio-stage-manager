
-- Enum destino
DO $$ BEGIN
  CREATE TYPE public.destino_retorno AS ENUM ('disponivel','manutencao','danificado','pendente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tabela conferencias_retorno
CREATE TABLE public.conferencias_retorno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  conferente_id uuid,
  conferente_nome text,
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  observacoes_finais text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ordem_id)
);

ALTER TABLE public.conferencias_retorno ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all conferencias_retorno"
ON public.conferencias_retorno FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'))
WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Staff view own setor conferencias_retorno"
ON public.conferencias_retorno FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM ordens_servico os
  WHERE os.id = conferencias_retorno.ordem_id
    AND os.setor_id = get_user_setor(auth.uid())
));

CREATE POLICY "Staff insert own setor conferencias_retorno"
ON public.conferencias_retorno FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM ordens_servico os
  WHERE os.id = conferencias_retorno.ordem_id
    AND os.setor_id = get_user_setor(auth.uid())
));

CREATE POLICY "Staff update own setor conferencias_retorno"
ON public.conferencias_retorno FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM ordens_servico os
  WHERE os.id = conferencias_retorno.ordem_id
    AND os.setor_id = get_user_setor(auth.uid())
));

CREATE TRIGGER trg_conferencias_retorno_updated
BEFORE UPDATE ON public.conferencias_retorno
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela conferencia_retorno_itens
CREATE TABLE public.conferencia_retorno_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conferencia_id uuid NOT NULL REFERENCES public.conferencias_retorno(id) ON DELETE CASCADE,
  equipamento_id uuid,
  nome_avulso text,
  is_avulso boolean NOT NULL DEFAULT false,
  quantidade_esperada integer NOT NULL DEFAULT 1,
  quantidade_conferida integer NOT NULL DEFAULT 0,
  destino public.destino_retorno NOT NULL DEFAULT 'disponivel',
  observacao text,
  conferido boolean NOT NULL DEFAULT false,
  conferido_em timestamptz,
  conferido_por uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conferencia_retorno_itens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins all conferencia_retorno_itens"
ON public.conferencia_retorno_itens FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'))
WITH CHECK (has_role(auth.uid(),'admin'));

CREATE POLICY "Staff view own setor conferencia_retorno_itens"
ON public.conferencia_retorno_itens FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM conferencias_retorno c
  JOIN ordens_servico os ON os.id = c.ordem_id
  WHERE c.id = conferencia_retorno_itens.conferencia_id
    AND os.setor_id = get_user_setor(auth.uid())
));

CREATE POLICY "Staff update own setor conferencia_retorno_itens"
ON public.conferencia_retorno_itens FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM conferencias_retorno c
  JOIN ordens_servico os ON os.id = c.ordem_id
  WHERE c.id = conferencia_retorno_itens.conferencia_id
    AND os.setor_id = get_user_setor(auth.uid())
));

CREATE POLICY "Staff insert own setor conferencia_retorno_itens"
ON public.conferencia_retorno_itens FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM conferencias_retorno c
  JOIN ordens_servico os ON os.id = c.ordem_id
  WHERE c.id = conferencia_retorno_itens.conferencia_id
    AND os.setor_id = get_user_setor(auth.uid())
));

-- Função: iniciar_conferencia_retorno
CREATE OR REPLACE FUNCTION public.iniciar_conferencia_retorno(_ordem_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conf_id uuid;
  uid uuid := auth.uid();
  uname text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Permissão: admin ou staff do setor da OS
  IF NOT has_role(uid, 'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = _ordem_id AND os.setor_id = get_user_setor(uid)
    ) THEN
      RAISE EXCEPTION 'Sem permissão para esta OS';
    END IF;
  END IF;

  SELECT nome INTO uname FROM profiles WHERE user_id = uid;

  -- Se já existe, retorna
  SELECT id INTO conf_id FROM conferencias_retorno WHERE ordem_id = _ordem_id;
  IF conf_id IS NOT NULL THEN
    RETURN conf_id;
  END IF;

  INSERT INTO conferencias_retorno (ordem_id, status, conferente_id, conferente_nome, iniciada_em)
  VALUES (_ordem_id, 'em_andamento', uid, uname, now())
  RETURNING id INTO conf_id;

  -- Popula itens a partir de ordem_equipamentos
  INSERT INTO conferencia_retorno_itens (conferencia_id, equipamento_id, quantidade_esperada, destino)
  SELECT conf_id, oe.equipamento_id, oe.quantidade, 'disponivel'
  FROM ordem_equipamentos oe
  WHERE oe.ordem_id = _ordem_id;

  RETURN conf_id;
END $$;

-- Função: finalizar_conferencia_retorno
CREATE OR REPLACE FUNCTION public.finalizar_conferencia_retorno(_conf_id uuid, _observacoes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  ord_id uuid;
  ord_num int;
  ord_cliente text;
  it record;
  has_pendente boolean := false;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT ordem_id INTO ord_id FROM conferencias_retorno WHERE id = _conf_id;
  IF ord_id IS NULL THEN
    RAISE EXCEPTION 'Conferência não encontrada';
  END IF;

  -- Permissão
  IF NOT has_role(uid,'admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM ordens_servico os
      WHERE os.id = ord_id AND os.setor_id = get_user_setor(uid)
    ) THEN
      RAISE EXCEPTION 'Sem permissão';
    END IF;
  END IF;

  SELECT numero, cliente INTO ord_num, ord_cliente FROM ordens_servico WHERE id = ord_id;

  FOR it IN
    SELECT * FROM conferencia_retorno_itens
    WHERE conferencia_id = _conf_id AND equipamento_id IS NOT NULL
  LOOP
    IF it.destino = 'disponivel' THEN
      UPDATE equipamentos SET status='disponivel', updated_at=now() WHERE id = it.equipamento_id;
      INSERT INTO movimentacao_estoque (equipamento_id, tipo, responsavel_id, ordem_id, motivo)
      VALUES (it.equipamento_id, 'retorno', uid, ord_id,
              format('Retorno OK - OS #%s - %s', ord_num, ord_cliente));
    ELSIF it.destino = 'manutencao' THEN
      UPDATE equipamentos SET status='manutencao', updated_at=now() WHERE id = it.equipamento_id;
      INSERT INTO manutencao (equipamento_id, tipo_reparo, descricao, responsavel_id, data_inicio)
      VALUES (it.equipamento_id, 'corretiva',
              COALESCE(it.observacao, format('Manutenção pós-retorno OS #%s', ord_num)),
              uid, CURRENT_DATE);
      INSERT INTO movimentacao_estoque (equipamento_id, tipo, responsavel_id, ordem_id, motivo)
      VALUES (it.equipamento_id, 'retorno_manutencao', uid, ord_id,
              format('Retorno → manutenção - OS #%s - %s', ord_num, COALESCE(it.observacao,'')));
    ELSIF it.destino = 'danificado' THEN
      UPDATE equipamentos SET status='danificado', updated_at=now() WHERE id = it.equipamento_id;
      INSERT INTO movimentacao_estoque (equipamento_id, tipo, responsavel_id, ordem_id, motivo)
      VALUES (it.equipamento_id, 'retorno_danificado', uid, ord_id,
              format('Retorno danificado - OS #%s - %s', ord_num, COALESCE(it.observacao,'')));
    ELSIF it.destino = 'pendente' THEN
      has_pendente := true;
    END IF;
  END LOOP;

  UPDATE conferencias_retorno
  SET status = CASE WHEN has_pendente THEN 'parcial' ELSE 'finalizada' END,
      finalizada_em = now(),
      observacoes_finais = COALESCE(_observacoes, observacoes_finais),
      updated_at = now()
  WHERE id = _conf_id;

  IF NOT has_pendente THEN
    UPDATE ordens_servico SET status='finalizada', updated_at=now() WHERE id = ord_id;
  END IF;
END $$;
