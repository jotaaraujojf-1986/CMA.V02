-- RPC para criar um usuário em auth.users diretamente via SQL,
-- contornando o endpoint signUp (afetado por "email logins disabled").
-- Requer pgcrypto para bcrypt (já incluso no Supabase por padrão).

CREATE OR REPLACE FUNCTION public.create_auth_user(
  p_email    TEXT,
  p_password TEXT
)
RETURNS UUID   -- retorna o novo auth_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_auth_id UUID;
BEGIN
  -- Apenas ADMIN, ASSISTANT ou SUPERADMIN podem criar usuários
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid()
      AND role IN ('ADMIN', 'ASSISTANT', 'SUPERADMIN')
  ) THEN
    RAISE EXCEPTION 'Permissão negada.';
  END IF;

  -- Verifica se já existe um usuário com esse e-mail em auth.users
  SELECT id INTO v_auth_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_auth_id IS NOT NULL THEN
    RETURN v_auth_id; -- já existe, retorna o id existente
  END IF;

  -- Cria o usuário em auth.users
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),   -- e-mail já confirmado (criado pelo admin)
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now()
  )
  RETURNING id INTO v_auth_id;

  -- Cria a identidade de e-mail (necessária para o signIn funcionar)
  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_auth_id,
    jsonb_build_object('sub', v_auth_id::text, 'email', p_email),
    'email',
    p_email,
    now(),
    now(),
    now()
  );

  RETURN v_auth_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_auth_user(TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
