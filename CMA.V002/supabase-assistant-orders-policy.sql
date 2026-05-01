-- ============================================
-- Script SQL para Supabase
-- Políticas RLS - ASSISTENTE pode excluir O.S.
-- ============================================
--
-- Este script permite que usuários ASSISTENTE e ADMIN
-- excluam Ordens de Serviço (work_orders)
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Habilitar Row Level Security na tabela work_orders (se ainda não estiver)
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas de exclusão existentes (se houver)
DROP POLICY IF EXISTS "work_orders_delete_policy" ON work_orders;
DROP POLICY IF EXISTS "admin_delete_orders_policy" ON work_orders;
DROP POLICY IF EXISTS "assistant_delete_orders_policy" ON work_orders;

-- 3. Criar política que permite ADMIN e ASSISTANT excluir ordens
CREATE POLICY "admin_assistant_delete_orders_policy" ON work_orders
  FOR DELETE
  USING (
    -- Permite se o usuário autenticado for ADMIN ou ASSISTANT
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- ============================================
-- ALTERNATIVA: Políticas Separadas
-- ============================================
-- Se preferir ter políticas separadas para ADMIN e ASSISTANT:

-- DROP POLICY IF EXISTS "admin_assistant_delete_orders_policy" ON work_orders;

-- CREATE POLICY "admin_delete_orders_policy" ON work_orders
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE id = auth.uid()::text
--       AND role = 'ADMIN'
--     )
--   );

-- CREATE POLICY "assistant_delete_orders_policy" ON work_orders
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM users
--       WHERE id = auth.uid()::text
--       AND role = 'ASSISTANT'
--     )
--   );

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para confirmar que as políticas foram criadas:
-- SELECT * FROM pg_policies WHERE tablename = 'work_orders' AND policyname LIKE '%delete%';

-- ============================================
-- COMPORTAMENTO ESPERADO:
-- ============================================
--
-- ADMIN pode excluir:
--   ✅ Qualquer ordem de serviço
--
-- ASSISTANT pode excluir:
--   ✅ Qualquer ordem de serviço
--
-- TECHNICIAN pode excluir:
--   ❌ Nenhuma ordem (sem política)
--
-- CLIENT pode excluir:
--   ❌ Nenhuma ordem (sem política)
--
-- ============================================
-- IMPORTANTE:
-- ============================================
--
-- 1. Estas políticas funcionam APENAS se você estiver usando Supabase Auth
--    com auth.uid() retornando o ID do usuário autenticado.
--
-- 2. Se você está usando autenticação customizada (como parece ser o caso),
--    você pode precisar DESABILITAR RLS e confiar nas validações do código:
--
--    ALTER TABLE work_orders DISABLE ROW LEVEL SECURITY;
--
-- 3. A validação no código do cliente já deve estar implementada,
--    então RLS é uma camada adicional de segurança.
--
-- ============================================
-- POLÍTICAS COMPLETAS RECOMENDADAS
-- ============================================
-- Para um sistema completo, você também precisa de políticas para:
-- SELECT, INSERT e UPDATE

-- Permitir ADMIN e ASSISTANT visualizar todas as ordens
CREATE POLICY "admin_assistant_select_orders_policy" ON work_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- Permitir ADMIN e ASSISTANT criar ordens
CREATE POLICY "admin_assistant_insert_orders_policy" ON work_orders
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND (role = 'ADMIN' OR role = 'ASSISTANT')
    )
  );

-- Permitir ADMIN e ASSISTANT atualizar ordens
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
-- DESABILITAR RLS (SE USAR AUTENTICAÇÃO CUSTOMIZADA)
-- ============================================
-- Se você NÃO está usando Supabase Auth, descomente a linha abaixo:
-- ALTER TABLE work_orders DISABLE ROW LEVEL SECURITY;

-- ============================================
