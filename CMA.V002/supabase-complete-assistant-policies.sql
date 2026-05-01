-- ============================================
-- Script SQL COMPLETO para Supabase
-- Todas as Políticas RLS - ASSISTENTE
-- ============================================
--
-- Este script configura TODAS as permissões para ASSISTENTE:
-- - Excluir usuários (exceto ADMIN)
-- - Excluir ordens de serviço
-- - Criar/editar/visualizar dados
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- ============================================
-- TABELA: users
-- ============================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "admin_delete_policy" ON users;
DROP POLICY IF EXISTS "assistant_delete_non_admin_policy" ON users;

-- ADMIN pode excluir qualquer usuário (exceto a si mesmo)
CREATE POLICY "admin_delete_users_policy" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND role = 'ADMIN'
    )
    AND id != auth.uid()::text
  );

-- ASSISTANT pode excluir usuários NÃO-ADMIN (exceto a si mesmo)
CREATE POLICY "assistant_delete_non_admin_policy" ON users
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND role = 'ASSISTANT'
    )
    AND role != 'ADMIN'
    AND id != auth.uid()::text
  );

-- ============================================
-- TABELA: work_orders
-- ============================================

-- Habilitar RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes
DROP POLICY IF EXISTS "work_orders_delete_policy" ON work_orders;
DROP POLICY IF EXISTS "admin_assistant_delete_orders_policy" ON work_orders;

-- ADMIN e ASSISTANT podem excluir ordens
CREATE POLICY "admin_assistant_delete_orders_policy" ON work_orders
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- ADMIN e ASSISTANT podem visualizar ordens
CREATE POLICY "admin_assistant_select_orders_policy" ON work_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- ADMIN e ASSISTANT podem criar ordens
CREATE POLICY "admin_assistant_insert_orders_policy" ON work_orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- ADMIN e ASSISTANT podem atualizar ordens
CREATE POLICY "admin_assistant_update_orders_policy" ON work_orders
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute estas queries para confirmar:

-- SELECT * FROM pg_policies WHERE tablename = 'users';
-- SELECT * FROM pg_policies WHERE tablename = 'work_orders';

-- ============================================
-- IMPORTANTE - AUTENTICAÇÃO CUSTOMIZADA
-- ============================================
--
-- Se você está usando autenticação customizada (não Supabase Auth),
-- as políticas acima NÃO funcionarão porque auth.uid() retornará NULL.
--
-- Neste caso, você tem 2 opções:
--
-- OPÇÃO 1: Desabilitar RLS (mais simples)
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE work_orders DISABLE ROW LEVEL SECURITY;
--
-- OPÇÃO 2: Usar service_role key no cliente
-- (não recomendado para produção)
--
-- RECOMENDAÇÃO: Como você já tem validações robustas no código
-- do cliente (App.tsx), desabilitar RLS é seguro e mais simples.
--
-- ============================================
