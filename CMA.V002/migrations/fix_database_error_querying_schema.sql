-- ============================================================
-- PASSO 1: Forçar reload do cache do PostgREST
-- (resolve "Database error querying schema" na maioria dos casos)
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- PASSO 2: Garantir que o hook de JWT está desativado
-- (o hook quebrado era a causa original desse erro)
-- ============================================================
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN event;
END;
$$;

-- ============================================================
-- PASSO 3: Verificar usuários sem auth_id vinculado
-- (usuários criados sem auth_id não conseguem logar)
-- ============================================================
SELECT
  u.id,
  u.name,
  u.email,
  u.role,
  u.auth_id,
  a.id AS auth_users_id,
  a.email AS auth_email,
  a.created_at AS auth_created_at
FROM public.users u
LEFT JOIN auth.users a ON a.email = u.email
WHERE u.auth_id IS NULL
ORDER BY u.email;

-- ============================================================
-- PASSO 4: Vincular automaticamente usuários sem auth_id
-- (usa o e-mail como chave de correspondência entre as tabelas)
-- ============================================================
UPDATE public.users u
SET auth_id = a.id
FROM auth.users a
WHERE a.email = u.email
  AND u.auth_id IS NULL
  AND a.id IS NOT NULL;

-- Confirma quantos foram vinculados
SELECT COUNT(*) AS usuarios_vinculados
FROM public.users
WHERE auth_id IS NOT NULL;

-- ============================================================
-- PASSO 5: Verificar estado final - usuários ainda sem auth_id
-- (esses usuários precisam ser recriados)
-- ============================================================
SELECT id, name, email, role
FROM public.users
WHERE auth_id IS NULL;

NOTIFY pgrst, 'reload schema';
