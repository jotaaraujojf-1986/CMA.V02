-- Desativa o Hook de JWT Customizado (Fazendo ele apenas retornar o evento sem fazer nada)
-- Isso evita qualquer erro durante o login (signInWithPassword) que estava barrando a entrada!

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Retorna o evento intacto. Não precisamos mais do hook pois as políticas
  -- de RLS agora verificam o banco de dados dinamicamente!
  RETURN event;
END;
$$;
