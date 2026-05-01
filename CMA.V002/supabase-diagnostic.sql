-- ============================================
-- Script de Diagnóstico - Supabase
-- Verificar estrutura da tabela users
-- ============================================
--
-- Execute este script para diagnosticar o problema
-- com usuários ASSISTENTE não sendo salvos
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Verificar tipo de dados da coluna 'role'
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'users' 
AND column_name = 'role';

-- Resultado esperado:
-- column_name | data_type      | udt_name
-- role        | USER-DEFINED   | user_role

-- ============================================

-- 2. Verificar valores permitidos no ENUM (se existir)
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid 
    FROM pg_type 
    WHERE typname = 'user_role'
)
ORDER BY enumsortorder;

-- Resultado esperado:
-- ADMIN
-- TECHNICIAN
-- CLIENT
-- ASSISTANT  ← Deve estar aqui!

-- ============================================

-- 3. Verificar estrutura completa da tabela users
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================

-- 4. Verificar se há constraints ou triggers
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'users'::regclass;

-- ============================================

-- 5. Testar inserção manual de ASSISTENTE
-- (Descomente para testar)

-- INSERT INTO users (
--     id, 
--     name, 
--     email, 
--     password, 
--     role, 
--     phone,
--     "avatarUrl"
-- ) VALUES (
--     'test-assistant-' || floor(random() * 1000)::text,
--     'Teste Assistente Manual',
--     'teste.manual.' || floor(random() * 1000)::text || '@cma.com',
--     '123',
--     'ASSISTANT',
--     '11999999999',
--     'https://ui-avatars.com/api/?name=Teste+Assistente&background=random'
-- );

-- Se der erro, copie a mensagem de erro EXATA

-- ============================================

-- 6. Verificar usuários existentes e seus roles
SELECT 
    id,
    name,
    email,
    role
FROM users
ORDER BY role, name;

-- ============================================
-- INSTRUÇÕES:
-- ============================================
--
-- 1. Execute cada query separadamente
-- 2. Copie os resultados
-- 3. Preste atenção especial na query #2
--    - Se ASSISTANT não aparecer, o ENUM não foi atualizado
-- 4. Se a query #5 (teste de inserção) der erro,
--    copie a mensagem de erro COMPLETA
--
-- ============================================
-- 7. Verificar valores permitidos no ENUM (versão simplificada)
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

