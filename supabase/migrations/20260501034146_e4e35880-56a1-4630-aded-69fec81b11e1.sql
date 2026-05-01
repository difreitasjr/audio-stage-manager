
-- =========================================================
-- 1. TABELA EMPRESAS
-- =========================================================
CREATE TABLE public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 2. CRIA EMPRESA INICIAL E BACKFILL
-- =========================================================
INSERT INTO public.empresas (id, nome) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Empresa Inicial');

-- =========================================================
-- 3. ADICIONA empresa_id EM TODAS AS TABELAS (nullable inicialmente)
-- =========================================================
ALTER TABLE public.profiles                    ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.user_roles                  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.setores                     ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.equipamentos                ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ordens_servico              ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.ordem_equipamentos          ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.movimentacao_estoque        ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.manutencao                  ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.conferencias_chegada        ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.conferencias_retorno        ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.conferencia_itens           ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;
ALTER TABLE public.conferencia_retorno_itens   ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE;

-- Backfill de todos os registros existentes
UPDATE public.profiles                  SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.user_roles                SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.setores                   SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.equipamentos              SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.ordens_servico            SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.ordem_equipamentos        SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.movimentacao_estoque      SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.manutencao                SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.conferencias_chegada      SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.conferencias_retorno      SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.conferencia_itens         SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;
UPDATE public.conferencia_retorno_itens SET empresa_id = '00000000-0000-0000-0000-000000000001' WHERE empresa_id IS NULL;

-- Tornar NOT NULL após backfill
ALTER TABLE public.profiles                  ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.user_roles                ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.setores                   ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.equipamentos              ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.ordens_servico            ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.ordem_equipamentos        ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.movimentacao_estoque      ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.manutencao                ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.conferencias_chegada      ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.conferencias_retorno      ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.conferencia_itens         ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE public.conferencia_retorno_itens ALTER COLUMN empresa_id SET NOT NULL;

-- =========================================================
-- 4. FUNÇÃO get_user_empresa
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_user_empresa(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- =========================================================
-- 5. TRIGGER set_empresa_id (auto-fill em INSERTs)
-- =========================================================
CREATE OR REPLACE FUNCTION public.set_empresa_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_user_empresa(auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER set_empresa_id_setores                   BEFORE INSERT ON public.setores                   FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_equipamentos              BEFORE INSERT ON public.equipamentos              FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_ordens_servico            BEFORE INSERT ON public.ordens_servico            FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_ordem_equipamentos        BEFORE INSERT ON public.ordem_equipamentos        FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_movimentacao_estoque      BEFORE INSERT ON public.movimentacao_estoque      FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_manutencao                BEFORE INSERT ON public.manutencao                FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_conferencias_chegada      BEFORE INSERT ON public.conferencias_chegada      FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_conferencias_retorno      BEFORE INSERT ON public.conferencias_retorno      FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_conferencia_itens         BEFORE INSERT ON public.conferencia_itens         FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();
CREATE TRIGGER set_empresa_id_conferencia_retorno_itens BEFORE INSERT ON public.conferencia_retorno_itens FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();

-- =========================================================
-- 6. NOVO handle_new_user - cria empresa OU vincula a empresa existente
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
  v_empresa_nome text;
  v_assigned_role app_role;
  v_setor_id uuid;
BEGIN
  v_empresa_nome := NEW.raw_user_meta_data->>'empresa_nome';
  v_empresa_id   := NULLIF(NEW.raw_user_meta_data->>'empresa_id','')::uuid;
  v_setor_id     := NULLIF(NEW.raw_user_meta_data->>'setor_id','')::uuid;

  IF v_empresa_nome IS NOT NULL THEN
    -- Novo signup público: cria empresa e vira admin dela
    INSERT INTO public.empresas (nome) VALUES (v_empresa_nome) RETURNING id INTO v_empresa_id;
    v_assigned_role := 'admin';
  ELSIF v_empresa_id IS NOT NULL THEN
    -- Cadastro feito por admin (via edge function): vira staff por padrão
    v_assigned_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'staff');
  ELSE
    -- Fallback: usa empresa inicial (compatibilidade)
    v_empresa_id := '00000000-0000-0000-0000-000000000001';
    v_assigned_role := 'staff';
  END IF;

  INSERT INTO public.profiles (user_id, nome, empresa_id, setor_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), v_empresa_id, v_setor_id);

  INSERT INTO public.user_roles (user_id, role, empresa_id)
  VALUES (NEW.id, v_assigned_role, v_empresa_id)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;

-- =========================================================
-- 7. RLS PARA empresas
-- =========================================================
CREATE POLICY "Users view own empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins update own empresa"
  ON public.empresas FOR UPDATE TO authenticated
  USING (id = public.get_user_empresa(auth.uid()) AND public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 8. RECRIA TODAS AS POLICIES COM ISOLAMENTO POR EMPRESA
-- =========================================================

-- ----- profiles -----
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile name" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admin all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile (safe fields only)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "View own profile or admin same empresa"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.has_role(auth.uid(), 'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  );

CREATE POLICY "Insert profile self or admin same empresa"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR (public.has_role(auth.uid(), 'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  );

CREATE POLICY "Update own profile safe fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND NOT (setor_id IS DISTINCT FROM (SELECT p.setor_id FROM profiles p WHERE p.user_id = auth.uid()))
    AND NOT (ativo IS DISTINCT FROM (SELECT p.ativo FROM profiles p WHERE p.user_id = auth.uid()))
    AND NOT (empresa_id IS DISTINCT FROM (SELECT p.empresa_id FROM profiles p WHERE p.user_id = auth.uid()))
  );

CREATE POLICY "Admins update profiles same empresa"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins delete profiles same empresa"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

-- ----- user_roles -----
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "View own roles or admin same empresa"
  ON public.user_roles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  );

CREATE POLICY "Admins insert roles same empresa"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins update roles same empresa"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins delete roles same empresa"
  ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

-- ----- setores -----
DROP POLICY IF EXISTS "Setores are viewable by authenticated users" ON public.setores;
DROP POLICY IF EXISTS "Only admins can insert setores" ON public.setores;
DROP POLICY IF EXISTS "Only admins can update setores" ON public.setores;
DROP POLICY IF EXISTS "Only admins can delete setores" ON public.setores;

CREATE POLICY "View setores same empresa"
  ON public.setores FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins insert setores same empresa"
  ON public.setores FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins update setores same empresa"
  ON public.setores FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Admins delete setores same empresa"
  ON public.setores FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

-- ----- equipamentos -----
DROP POLICY IF EXISTS "Admins can select equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Admins can insert equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Admins can update equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Admins can delete equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Staff can view own setor equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Staff can update own setor equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Staff can insert own setor equipamentos" ON public.equipamentos;

CREATE POLICY "Admins all equipamentos same empresa"
  ON public.equipamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view equipamentos own setor"
  ON public.equipamentos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND setor_id = public.get_user_setor(auth.uid()));

CREATE POLICY "Staff update equipamentos own setor"
  ON public.equipamentos FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND setor_id = public.get_user_setor(auth.uid()));

CREATE POLICY "Staff insert equipamentos own setor"
  ON public.equipamentos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND setor_id = public.get_user_setor(auth.uid()));

-- ----- ordens_servico -----
DROP POLICY IF EXISTS "Admins can select ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins can insert ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins can update ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Admins can delete ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Staff can view own setor ordens" ON public.ordens_servico;
DROP POLICY IF EXISTS "Staff can create ordens for own setor" ON public.ordens_servico;
DROP POLICY IF EXISTS "Staff can update own setor ordens" ON public.ordens_servico;

CREATE POLICY "Admins all ordens same empresa"
  ON public.ordens_servico FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view ordens own setor"
  ON public.ordens_servico FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND setor_id = public.get_user_setor(auth.uid()));

CREATE POLICY "Staff insert ordens own setor"
  ON public.ordens_servico FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND setor_id = public.get_user_setor(auth.uid()));

CREATE POLICY "Staff update ordens own setor"
  ON public.ordens_servico FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND setor_id = public.get_user_setor(auth.uid()));

-- ----- ordem_equipamentos -----
DROP POLICY IF EXISTS "Admins can do all ordem_equipamentos" ON public.ordem_equipamentos;
DROP POLICY IF EXISTS "Staff can view ordem_equipamentos" ON public.ordem_equipamentos;
DROP POLICY IF EXISTS "Staff can insert ordem_equipamentos" ON public.ordem_equipamentos;

CREATE POLICY "Admins all ordem_equipamentos same empresa"
  ON public.ordem_equipamentos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view ordem_equipamentos own setor"
  ON public.ordem_equipamentos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = ordem_equipamentos.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff insert ordem_equipamentos own setor"
  ON public.ordem_equipamentos FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = ordem_equipamentos.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

-- ----- movimentacao_estoque -----
DROP POLICY IF EXISTS "Admins can do all movimentacao" ON public.movimentacao_estoque;
DROP POLICY IF EXISTS "Staff can view own setor movimentacao" ON public.movimentacao_estoque;
DROP POLICY IF EXISTS "Staff can insert movimentacao" ON public.movimentacao_estoque;

CREATE POLICY "Admins all movimentacao same empresa"
  ON public.movimentacao_estoque FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view movimentacao own setor"
  ON public.movimentacao_estoque FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM equipamentos e WHERE e.id = movimentacao_estoque.equipamento_id AND e.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff insert movimentacao own setor"
  ON public.movimentacao_estoque FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM equipamentos e WHERE e.id = movimentacao_estoque.equipamento_id AND e.setor_id = public.get_user_setor(auth.uid())
  ));

-- ----- manutencao -----
DROP POLICY IF EXISTS "Admins can do all manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "Staff can view own setor manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "Staff can insert manutencao" ON public.manutencao;
DROP POLICY IF EXISTS "Staff can update manutencao" ON public.manutencao;

CREATE POLICY "Admins all manutencao same empresa"
  ON public.manutencao FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view manutencao own setor"
  ON public.manutencao FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM equipamentos e WHERE e.id = manutencao.equipamento_id AND e.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff insert manutencao own setor"
  ON public.manutencao FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM equipamentos e WHERE e.id = manutencao.equipamento_id AND e.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update manutencao own setor"
  ON public.manutencao FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM equipamentos e WHERE e.id = manutencao.equipamento_id AND e.setor_id = public.get_user_setor(auth.uid())
  ));

-- ----- conferencias_chegada -----
DROP POLICY IF EXISTS "Admins all conferencias" ON public.conferencias_chegada;
DROP POLICY IF EXISTS "Staff view own setor conferencias" ON public.conferencias_chegada;
DROP POLICY IF EXISTS "Staff update own setor conferencias" ON public.conferencias_chegada;

CREATE POLICY "Admins all conferencias_chegada same empresa"
  ON public.conferencias_chegada FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view conferencias_chegada own setor"
  ON public.conferencias_chegada FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = conferencias_chegada.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update conferencias_chegada own setor"
  ON public.conferencias_chegada FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = conferencias_chegada.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

-- ----- conferencias_retorno -----
DROP POLICY IF EXISTS "Admins all conferencias_retorno" ON public.conferencias_retorno;
DROP POLICY IF EXISTS "Staff view own setor conferencias_retorno" ON public.conferencias_retorno;
DROP POLICY IF EXISTS "Staff insert own setor conferencias_retorno" ON public.conferencias_retorno;
DROP POLICY IF EXISTS "Staff update own setor conferencias_retorno" ON public.conferencias_retorno;

CREATE POLICY "Admins all conferencias_retorno same empresa"
  ON public.conferencias_retorno FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view conferencias_retorno own setor"
  ON public.conferencias_retorno FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = conferencias_retorno.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff insert conferencias_retorno own setor"
  ON public.conferencias_retorno FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = conferencias_retorno.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update conferencias_retorno own setor"
  ON public.conferencias_retorno FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM ordens_servico os WHERE os.id = conferencias_retorno.ordem_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

-- ----- conferencia_itens -----
DROP POLICY IF EXISTS "Admins all conferencia_itens" ON public.conferencia_itens;
DROP POLICY IF EXISTS "Staff view own setor conferencia_itens" ON public.conferencia_itens;
DROP POLICY IF EXISTS "Staff update own setor conferencia_itens" ON public.conferencia_itens;

CREATE POLICY "Admins all conferencia_itens same empresa"
  ON public.conferencia_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view conferencia_itens own setor"
  ON public.conferencia_itens FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM conferencias_chegada c JOIN ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_itens.conferencia_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update conferencia_itens own setor"
  ON public.conferencia_itens FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM conferencias_chegada c JOIN ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_itens.conferencia_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

-- ----- conferencia_retorno_itens -----
DROP POLICY IF EXISTS "Admins all conferencia_retorno_itens" ON public.conferencia_retorno_itens;
DROP POLICY IF EXISTS "Staff view own setor conferencia_retorno_itens" ON public.conferencia_retorno_itens;
DROP POLICY IF EXISTS "Staff update own setor conferencia_retorno_itens" ON public.conferencia_retorno_itens;
DROP POLICY IF EXISTS "Staff insert own setor conferencia_retorno_itens" ON public.conferencia_retorno_itens;

CREATE POLICY "Admins all conferencia_retorno_itens same empresa"
  ON public.conferencia_retorno_itens FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') AND empresa_id = public.get_user_empresa(auth.uid()));

CREATE POLICY "Staff view conferencia_retorno_itens own setor"
  ON public.conferencia_retorno_itens FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM conferencias_retorno c JOIN ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_retorno_itens.conferencia_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff update conferencia_retorno_itens own setor"
  ON public.conferencia_retorno_itens FOR UPDATE TO authenticated
  USING (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM conferencias_retorno c JOIN ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_retorno_itens.conferencia_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));

CREATE POLICY "Staff insert conferencia_retorno_itens own setor"
  ON public.conferencia_retorno_itens FOR INSERT TO authenticated
  WITH CHECK (empresa_id = public.get_user_empresa(auth.uid()) AND EXISTS (
    SELECT 1 FROM conferencias_retorno c JOIN ordens_servico os ON os.id = c.ordem_id
    WHERE c.id = conferencia_retorno_itens.conferencia_id AND os.setor_id = public.get_user_setor(auth.uid())
  ));
