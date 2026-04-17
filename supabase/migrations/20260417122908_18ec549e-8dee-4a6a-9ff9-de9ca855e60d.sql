ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS modelo text,
  ADD COLUMN IF NOT EXISTS categoria text;

CREATE INDEX IF NOT EXISTS idx_equipamentos_codigo_barras ON public.equipamentos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_equipamentos_numero_serie ON public.equipamentos(numero_serie);