-- ============================================
-- Script SQL para Supabase
-- Adicionar ASSISTANT ao ENUM de roles
-- ============================================
--
-- PROBLEMA: Usuários ASSISTENTE não estão sendo salvos
-- CAUSA: A coluna 'role' na tabela 'users' usa um ENUM
--        que não inclui o valor 'ASSISTANT'
--
-- SOLUÇÃO: Adicionar 'ASSISTANT' ao tipo ENUM
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- OPÇÃO 1: Adicionar valor ao ENUM existente (RECOMENDADO)
-- Esta é a forma mais segura e mantém a integridade dos dados

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ASSISTANT';

-- ============================================
-- OPÇÃO 2: Recriar o ENUM (se OPÇÃO 1 falhar)
-- ============================================
-- Use apenas se a OPÇÃO 1 não funcionar

-- Passo 1: Alterar coluna para TEXT temporariamente
-- ALTER TABLE users ALTER COLUMN role TYPE TEXT;

-- Passo 2: Dropar o tipo antigo
-- DROP TYPE IF EXISTS user_role;

-- Passo 3: Criar novo tipo com ASSISTANT
-- CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'CLIENT', 'ASSISTANT');

-- Passo 4: Converter coluna de volta para o ENUM
-- ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;

-- ============================================
-- OPÇÃO 3: Mudar para TEXT (mais flexível)
-- ============================================
-- Se você quiser remover a restrição de ENUM completamente

-- ALTER TABLE users ALTER COLUMN role TYPE TEXT;

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para verificar os valores permitidos:

-- SELECT enumlabel 
-- FROM pg_enum 
-- WHERE enumtypid = 'user_role'::regtype 
-- ORDER BY enumsortorder;

-- Resultado esperado:
-- ADMIN
-- TECHNICIAN
-- CLIENT
-- ASSISTANT

-- ============================================
-- TESTE
-- ============================================
-- Após executar o script, teste criando um usuário ASSISTANT:

-- INSERT INTO users (id, name, email, password, role, phone)
-- VALUES (
--   'test-assistant-001',
--   'Teste Assistente',
--   'assistente@teste.com',
--   '123',
--   'ASSISTANT',
--   '11999999999'
-- );

-- Se funcionar, delete o teste:
-- DELETE FROM users WHERE id = 'test-assistant-001';

-- ============================================
-- IMPORTANTE
-- ============================================
--
-- 1. Execute APENAS a OPÇÃO 1 primeiro
-- 2. Se der erro, tente a OPÇÃO 2
-- 3. A OPÇÃO 3 é para casos extremos
--
-- 4. Após executar, teste criando um usuário ASSISTANT
--    pela interface do sistema
--
-- 5. Verifique no Supabase Table Editor se o usuário
--    foi criado com role = 'ASSISTANT'
--
-- ============================================
