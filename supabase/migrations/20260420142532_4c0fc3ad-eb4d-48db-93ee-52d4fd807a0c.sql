
-- 1) Restringir UPDATE em profiles: usuários só podem alterar 'nome' (não setor_id nem ativo)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile name"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND setor_id IS NOT DISTINCT FROM (SELECT setor_id FROM public.profiles WHERE user_id = auth.uid())
  AND ativo IS NOT DISTINCT FROM (SELECT ativo FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2) Restringir SELECT em profiles: ver o próprio ou admin vê todos
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admin all"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3) RPC pública para verificar se admin existe (para a página /setup)
CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;
