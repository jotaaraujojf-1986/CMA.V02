-- Concede permissão de execução da função para usuários autenticados
-- A falta disso é a causa #1 de "Database error querying schema" ao usar funções customizadas no RLS
GRANT EXECUTE ON FUNCTION public.get_auth_empresa_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_empresa_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_auth_empresa_id() TO service_role;

-- Apenas para garantir que o PostgREST atualize suas rotas e permissões
NOTIFY pgrst, 'reload schema';
