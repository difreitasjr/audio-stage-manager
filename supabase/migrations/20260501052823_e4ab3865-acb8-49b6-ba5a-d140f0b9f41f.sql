-- 1. Adicionar campos de assinatura em empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS plano text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS status_assinatura text NOT NULL DEFAULT 'trial',
  ADD COLUMN IF NOT EXISTS trial_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS trial_fim timestamptz,
  ADD COLUMN IF NOT EXISTS assinatura_inicio timestamptz,
  ADD COLUMN IF NOT EXISTS assinatura_proxima_cobranca timestamptz,
  ADD COLUMN IF NOT EXISTS cakto_customer_id text,
  ADD COLUMN IF NOT EXISTS cakto_subscription_id text,
  ADD COLUMN IF NOT EXISTS cakto_last_event jsonb;

-- Backfill empresas existentes: dar trial de 7 dias a partir de agora
UPDATE public.empresas
SET trial_inicio = COALESCE(trial_inicio, now()),
    trial_fim = COALESCE(trial_fim, now() + interval '7 days')
WHERE trial_inicio IS NULL OR trial_fim IS NULL;

-- 2. Trigger para definir trial automático em novas empresas
CREATE OR REPLACE FUNCTION public.set_trial_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.trial_inicio IS NULL THEN
    NEW.trial_inicio := now();
  END IF;
  IF NEW.trial_fim IS NULL THEN
    NEW.trial_fim := NEW.trial_inicio + interval '7 days';
  END IF;
  IF NEW.plano IS NULL THEN
    NEW.plano := 'trial';
  END IF;
  IF NEW.status_assinatura IS NULL THEN
    NEW.status_assinatura := 'trial';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_trial_defaults ON public.empresas;
CREATE TRIGGER trg_set_trial_defaults
BEFORE INSERT ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_defaults();

-- 3. Função: empresa tem acesso?
CREATE OR REPLACE FUNCTION public.empresa_tem_acesso(_empresa_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.empresas
    WHERE id = _empresa_id
      AND (
        (status_assinatura = 'trial' AND trial_fim > now())
        OR status_assinatura = 'ativa'
      )
  );
$$;

-- 4. Função: dias restantes de trial
CREATE OR REPLACE FUNCTION public.dias_restantes_trial(_empresa_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(0, EXTRACT(DAY FROM (trial_fim - now()))::int)
  FROM public.empresas WHERE id = _empresa_id;
$$;

-- 5. Tabela de pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  cakto_event_id text UNIQUE,
  cakto_transaction_id text,
  cakto_subscription_id text,
  tipo_evento text NOT NULL,
  status text NOT NULL,
  valor numeric(10,2),
  metodo text,
  plano text,
  raw_payload jsonb,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa ON public.pagamentos(empresa_id, criado_em DESC);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view pagamentos same empresa"
ON public.pagamentos FOR SELECT
TO authenticated
USING (has_role(auth.uid(),'admin') AND empresa_id = get_user_empresa(auth.uid()));

-- (Inserts são feitos pela edge function via service role; nenhuma policy de insert para usuários)