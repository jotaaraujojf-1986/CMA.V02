-- Habilita a extensão pgcrypto (necessária para criptografar a senha)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Atualiza a restrição (CHECK) da coluna role para permitir SUPERADMIN
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'TECHNICIAN', 'CLIENT', 'ASSISTANT', 'SUPERADMIN'));

DO $$
DECLARE
  v_auth_id uuid := gen_random_uuid();
  v_empresa_id uuid;
BEGIN
  -- 1. Cria uma empresa fictícia para o Superadmin
  SELECT id INTO v_empresa_id FROM public.empresas WHERE email = 'superadmin@mail.com' LIMIT 1;
  
  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, email, plano, status)
    VALUES ('ServiceFlow Admin', 'superadmin@mail.com', 'business', 'ativo')
    RETURNING id INTO v_empresa_id;
  END IF;

  -- 2. Cria o usuário na tabela auth.users (Tabela nativa do Supabase)
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin@mail.com') THEN
    INSERT INTO auth.users (
      id, 
      instance_id, 
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
      v_auth_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'superadmin@mail.com',
      crypt('123456', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{}',
      now(),
      now()
    );
    
    -- 3. Identidade para permitir login (Tabela nativa do Supabase)
    INSERT INTO auth.identities (
      id, 
      provider_id,
      user_id, 
      identity_data, 
      provider, 
      last_sign_in_at, 
      created_at, 
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_auth_id::text,
      v_auth_id,
      format('{"sub":"%s","email":"%s"}', v_auth_id::text, 'superadmin@mail.com')::jsonb,
      'email',
      now(),
      now(),
      now()
    );

    -- 4. Cria em public.users (A tabela da nossa aplicação)
    INSERT INTO public.users (id, auth_id, name, email, role, classification, empresa_id)
    VALUES (
      gen_random_uuid(),
      v_auth_id,
      'Super Administrador',
      'superadmin@mail.com',
      'SUPERADMIN',
      'PLENO',
      v_empresa_id
    );
  END IF;
END;
$$;
