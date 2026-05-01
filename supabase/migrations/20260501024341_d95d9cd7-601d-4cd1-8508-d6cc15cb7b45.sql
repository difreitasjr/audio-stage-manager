
REVOKE EXECUTE ON FUNCTION public.iniciar_conferencia_retorno(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finalizar_conferencia_retorno(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.iniciar_conferencia_retorno(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalizar_conferencia_retorno(uuid, text) TO authenticated;
