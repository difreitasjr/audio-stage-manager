-- Adicionar campo de responsável como texto livre na ordem de serviço
ALTER TABLE public.ordens_servico
  ADD COLUMN IF NOT EXISTS responsavel_nome text;

-- Tornar o vínculo de responsável (perfil) opcional, já que usaremos texto livre
ALTER TABLE public.ordens_servico
  ALTER COLUMN responsavel_id DROP NOT NULL;

-- Migrar dados existentes: copiar nome do profile para o novo campo
UPDATE public.ordens_servico o
SET responsavel_nome = p.nome
FROM public.profiles p
WHERE o.responsavel_id = p.id
  AND o.responsavel_nome IS NULL;

-- Definir um valor padrão para registros antigos sem responsável
UPDATE public.ordens_servico
SET responsavel_nome = 'Não informado'
WHERE responsavel_nome IS NULL;

-- Agora tornar obrigatório
ALTER TABLE public.ordens_servico
  ALTER COLUMN responsavel_nome SET NOT NULL;