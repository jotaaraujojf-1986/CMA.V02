-- ============================================
-- Script SQL para Supabase
-- Política de Exclusão de Usuários - ASSISTENTE
-- ============================================
--
-- Este script permite que usuários ASSISTENTE excluam outros usuários,
-- MAS NÃO podem excluir usuários com role ADMIN.
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- 1. Habilitar Row Level Security na tabela users (se ainda não estiver)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas de exclusão existentes (se houver)
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_prevent_self_delete" ON users;
DROP POLICY IF EXISTS "assistant_delete_non_admin_policy" ON users;

-- 3. Criar política que permite ADMIN excluir qualquer usuário (exceto a si mesmo)
CREATE POLICY "admin_delete_policy" ON users
  FOR DELETE
  USING (
    -- Permite se o usuário autenticado for ADMIN
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND role = 'ADMIN'
    )
    -- E não está tentando excluir a si mesmo
    AND id != auth.uid()::text
  );

-- 4. Criar política que permite ASSISTENTE excluir usuários NÃO-ADMIN
CREATE POLICY "assistant_delete_non_admin_policy" ON users
  FOR DELETE
  USING (
    -- Permite se o usuário autenticado for ASSISTANT
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND role = 'ASSISTANT'
    )
    -- E o usuário a ser excluído NÃO é ADMIN
    AND role != 'ADMIN'
    -- E não está tentando excluir a si mesmo
    AND id != auth.uid()::text
  );

-- ============================================
-- VERIFICAÇÃO
-- ============================================
-- Execute esta query para confirmar que as políticas foram criadas:
-- SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname LIKE '%delete%';

-- ============================================
-- COMPORTAMENTO ESPERADO:
-- ============================================
--
-- ADMIN pode excluir:
--   ✅ Outros ADMIN (exceto a si mesmo)
--   ✅ TECHNICIAN
--   ✅ ASSISTANT
--   ✅ CLIENT
--
-- ASSISTANT pode excluir:
--   ❌ ADMIN (bloqueado pela política)
--   ✅ TECHNICIAN
--   ✅ Outros ASSISTANT (exceto a si mesmo)
--   ✅ CLIENT
--
-- TECHNICIAN e CLIENT:
--   ❌ Não podem excluir ninguém
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
--    ALTER TABLE users DISABLE ROW LEVEL SECURITY;
--
-- 3. A validação no código do cliente (handleDeleteUser) já implementa
--    a lógica necessária, então RLS é uma camada adicional de segurança.
--
-- ============================================
-- ALTERNATIVA SEM SUPABASE AUTH:
-- ============================================
--
-- Se você NÃO está usando Supabase Auth, a melhor abordagem é
-- implementar a validação no código do cliente.
--
-- Adicione esta validação no handleDeleteUser (App.tsx):
--
-- const userToDelete = usersList.find(u => u.id === userId);
-- if (user?.role === 'ASSISTANT' && userToDelete?.role === 'ADMIN') {
--   alert('Assistentes não podem excluir administradores.');
--   return;
-- }
--
-- ============================================
