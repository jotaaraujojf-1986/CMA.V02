-- RPC para excluir usuário de public.users E auth.users atomicamente.
-- SECURITY DEFINER faz a função rodar com privilégios do owner (postgres),
-- que tem acesso ao schema auth — algo que a anon key não tem.

CREATE OR REPLACE FUNCTION public.delete_user_completely(p_user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Verifica se o chamador tem permissão (deve ser ADMIN ou ASSISTANT)
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'ASSISTANT', 'SUPERADMIN')
  ) THEN
    RAISE EXCEPTION 'Permissão negada: apenas ADMIN ou ASSISTANT podem excluir usuários.';
  END IF;

  -- Captura o auth_id antes de excluir de public.users
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;

  -- 1. Exclui de public.users
  --    (cascade cuida de notifications; audit_logs e orders ficam com SET NULL)
  DELETE FROM public.users WHERE id = p_user_id;

  -- 2. Exclui de auth.users se houver vínculo
  IF v_auth_id IS NOT NULL THEN
    DELETE FROM auth.users WHERE id = v_auth_id;
  END IF;
END;
$$;

-- Permite que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION public.delete_user_completely(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
