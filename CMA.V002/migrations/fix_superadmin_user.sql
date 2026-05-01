-- Insere o registro em public.users para o SUPERADMIN que já existe no auth.users
-- (O insert anterior falhou por causa do constraint ENUM/CHECK, mas o auth.users foi criado)

DO $$
DECLARE
  v_auth_id uuid;
  v_empresa_id uuid;
BEGIN
  -- Busca o auth_id do superadmin que já foi criado no auth.users
  SELECT id INTO v_auth_id FROM auth.users WHERE email = 'superadmin@mail.com' LIMIT 1;

  IF v_auth_id IS NULL THEN
    RAISE EXCEPTION 'Usuário superadmin não encontrado no auth.users. Rode o seed_superadmin.sql primeiro.';
  END IF;

  -- Busca ou cria a empresa do superadmin
  SELECT id INTO v_empresa_id FROM public.empresas WHERE email = 'superadmin@mail.com' LIMIT 1;

  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, email, plano, status)
    VALUES ('ServiceFlow Admin', 'superadmin@mail.com', 'business', 'ativo')
    RETURNING id INTO v_empresa_id;
  END IF;

  -- Só cria se ainda não existir em public.users
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE auth_id = v_auth_id) THEN
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
    RAISE NOTICE 'Usuário SUPERADMIN criado com sucesso!';
  ELSE
    RAISE NOTICE 'Usuário SUPERADMIN já existia em public.users.';
  END IF;
END;
$$;
