ALTER TABLE public.conferencia_itens
  ADD COLUMN IF NOT EXISTS nome_avulso text,
  ADD COLUMN IF NOT EXISTS is_avulso boolean NOT NULL DEFAULT false;

ALTER TABLE public.conferencia_itens
  ALTER COLUMN equipamento_id DROP NOT NULL;

ALTER TABLE public.conferencia_itens
  ADD CONSTRAINT conferencia_itens_equipamento_or_avulso
  CHECK (
    (is_avulso = true AND nome_avulso IS NOT NULL AND equipamento_id IS NULL)
    OR (is_avulso = false AND equipamento_id IS NOT NULL)
  );