
-- Adiciona DEFAULT que usa o usuário autenticado para preencher empresa_id automaticamente
-- Isso torna a coluna "opcional" nos types do TypeScript.

ALTER TABLE public.profiles                  ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.user_roles                ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.setores                   ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.equipamentos              ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.ordens_servico            ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.ordem_equipamentos        ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.movimentacao_estoque      ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.manutencao                ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.conferencias_chegada      ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.conferencias_retorno      ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.conferencia_itens         ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());
ALTER TABLE public.conferencia_retorno_itens ALTER COLUMN empresa_id SET DEFAULT public.get_user_empresa(auth.uid());

-- Também fixa search_path nas funções que ficaram sem
CREATE OR REPLACE FUNCTION public.gen_conferencia_token()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $function$
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
$function$;
