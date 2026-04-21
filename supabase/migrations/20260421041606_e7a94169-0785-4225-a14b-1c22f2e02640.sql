-- Add new columns to equipamentos
ALTER TABLE public.equipamentos
  ADD COLUMN IF NOT EXISTS especificacoes JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS estado_conservacao TEXT NOT NULL DEFAULT 'bom',
  ADD COLUMN IF NOT EXISTS numero_patrimonio TEXT,
  ADD COLUMN IF NOT EXISTS data_ultima_revisao DATE,
  ADD COLUMN IF NOT EXISTS proxima_revisao DATE,
  ADD COLUMN IF NOT EXISTS acessorios TEXT;

-- Create storage bucket for equipment photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('equipamento-fotos', 'equipamento-fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Equipamento fotos são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipamento-fotos');

CREATE POLICY "Authenticated podem enviar fotos de equipamento"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'equipamento-fotos');

CREATE POLICY "Authenticated podem atualizar fotos de equipamento"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'equipamento-fotos');

CREATE POLICY "Authenticated podem deletar fotos de equipamento"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'equipamento-fotos');