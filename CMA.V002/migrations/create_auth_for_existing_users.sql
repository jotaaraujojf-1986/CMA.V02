-- Cria contas em auth.users para técnicos que existem apenas em public.users
-- Senha temporária padrão: CMA@2025 (o usuário deve alterar após o primeiro login)

DO $$
DECLARE
  u RECORD;
  v_auth_id UUID;
  v_temp_password TEXT := 'CMA@2025';
BEGIN
  -- Itera sobre usuários sem auth_id que também não existem em auth.users
  FOR u IN
    SELECT pu.id, pu.email
    FROM public.users pu
    LEFT JOIN auth.users au ON au.email = pu.email
    WHERE pu.auth_id IS NULL
      AND au.id IS NULL
  LOOP
    -- Cria o registro em auth.users
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
      u.email,
      crypt(v_temp_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now()
    )
    RETURNING id INTO v_auth_id;

    -- Cria a identidade de e-mail (necessária para signIn funcionar)
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
      jsonb_build_object('sub', v_auth_id::text, 'email', u.email),
      'email',
      u.email,
      now(),
      now(),
      now()
    );

    -- Vincula o auth_id ao registro em public.users
    UPDATE public.users
    SET auth_id = v_auth_id
    WHERE id = u.id;

    RAISE NOTICE 'Conta criada para: % (auth_id: %)', u.email, v_auth_id;
  END LOOP;
END $$;

-- Confirma resultado
SELECT u.name, u.email, u.role, u.auth_id
FROM public.users u
ORDER BY u.role, u.name;

NOTIFY pgrst, 'reload schema';
