-- RPC para sincronizar email e/ou senha do usuário em auth.users.
-- Necessário pois auth.users exige privilégios de admin (service role),
-- que a anon key do frontend não possui.
-- SECURITY DEFINER faz a função rodar como postgres, que tem acesso ao schema auth.

CREATE OR REPLACE FUNCTION public.update_user_auth_credentials(
  p_user_id   TEXT,
  p_new_email TEXT    DEFAULT NULL,
  p_new_password TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Apenas ADMIN, ASSISTANT ou SUPERADMIN podem alterar credenciais de outros usuários
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'ASSISTANT', 'SUPERADMIN')
  ) THEN
    -- Permite que o próprio usuário altere suas próprias credenciais
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_id = auth.uid() AND id = p_user_id
    ) THEN
      RAISE EXCEPTION 'Permissão negada.';
    END IF;
  END IF;

  -- Busca o auth_id vinculado ao usuário público
  SELECT auth_id INTO v_auth_id FROM public.users WHERE id = p_user_id;

  IF v_auth_id IS NULL THEN
    RETURN; -- Usuário sem vínculo com auth.users, nada a sincronizar
  END IF;

  -- Atualiza e-mail em auth.users
  IF p_new_email IS NOT NULL AND p_new_email != '' THEN
    UPDATE auth.users
    SET
      email               = p_new_email,
      email_confirmed_at  = COALESCE(email_confirmed_at, now())
    WHERE id = v_auth_id;
  END IF;

  -- Atualiza senha em auth.users (usa bcrypt via pgcrypto)
  IF p_new_password IS NOT NULL AND p_new_password != '' THEN
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_password, gen_salt('bf'))
    WHERE id = v_auth_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_user_auth_credentials(TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
