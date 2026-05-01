-- ============================================
-- Script SQL SIMPLIFICADO para Supabase
-- Configuração de Permissões Básicas
-- ============================================
--
-- Como você está usando autenticação customizada (não Supabase Auth),
-- este script configura permissões básicas para a tabela users.
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- Opção 1: DESABILITAR RLS (Mais Simples)
-- ============================================
-- Se você confia nas validações do código do cliente,
-- pode simplesmente desabilitar RLS na tabela users:

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Com RLS desabilitado, todas as operações são permitidas via API.
-- A segurança é garantida pelo código do cliente (handleDeleteUser).

-- ============================================
-- Opção 2: RLS com Permissão Total (Recomendado para Desenvolvimento)
-- ============================================
-- Se você quer manter RLS habilitado mas permitir todas as operações:

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- DROP POLICY IF EXISTS "users_allow_all" ON users;

-- CREATE POLICY "users_allow_all" ON users
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- ============================================
-- INSTRUÇÕES DE USO:
-- ============================================
--
-- 1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
-- 2. Selecione seu projeto
-- 3. Vá em "SQL Editor" no menu lateral
-- 4. Cole este script
-- 5. Descomente a opção que você preferir (Opção 1 ou Opção 2)
-- 6. Clique em "Run" para executar
--
-- RECOMENDAÇÃO: Use Opção 1 (DISABLE RLS) para simplicidade,
-- já que você tem validações robustas no código do cliente.
--
-- ============================================
