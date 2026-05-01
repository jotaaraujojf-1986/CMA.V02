-- Diagnóstico completo do superadmin
-- Rode cada query separadamente e veja os resultados

-- 1. Verificar se o usuário existe no auth.users
SELECT id, email, email_confirmed_at, created_at
FROM auth.users
WHERE email = 'superadmin@mail.com';

-- 2. Verificar se existe identidade vinculada
SELECT id, user_id, provider, provider_id, identity_data
FROM auth.identities
WHERE identity_data::text LIKE '%superadmin@mail.com%';

-- 3. Verificar se existe em public.users
SELECT id, auth_id, name, email, role, empresa_id
FROM public.users
WHERE email = 'superadmin@mail.com';

-- 4. Verificar a empresa do superadmin
SELECT id, nome, email, plano, status
FROM public.empresas
WHERE email = 'superadmin@mail.com';
