ALTER TABLE public.conferencia_itens
  ADD COLUMN IF NOT EXISTS problema_resolvido boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS resolucao_observacao text,
  ADD COLUMN IF NOT EXISTS resolvido_em timestamp with time zone,
  ADD COLUMN IF NOT EXISTS resolvido_por uuid;