-- ============================================
-- Script SQL para Políticas de Exclusão de Usuários
-- Supabase - C.M.A (Controle de Montagens e Assistências)
-- ============================================
-- 
-- Este script configura as políticas de segurança (RLS) para permitir
-- que apenas administradores excluam usuários da tabela 'users'.
--
-- IMPORTANTE: Execute este script no SQL Editor do Supabase
-- ============================================

-- 1. Habilitar Row Level Security (RLS) na tabela users (se ainda não estiver habilitado)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2. Remover política de exclusão existente (se houver)
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- 3. Criar política que permite apenas ADMINs excluírem usuários
-- Esta política verifica se o usuário autenticado tem role 'ADMIN'
CREATE POLICY "users_delete_policy" ON users
  FOR DELETE
  USING (
    -- Permite exclusão apenas se o usuário autenticado for ADMIN
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()::text
      AND role = 'ADMIN'
    )
  );

-- 4. OPCIONAL: Criar política adicional para prevenir auto-exclusão
-- Esta política impede que um admin exclua a si mesmo
DROP POLICY IF EXISTS "users_prevent_self_delete" ON users;

CREATE POLICY "users_prevent_self_delete" ON users
  FOR DELETE
  USING (
    -- Impede que o usuário exclua seu próprio registro
    id != auth.uid()::text
  );

-- 5. Verificar políticas criadas
-- Execute esta query para confirmar que as políticas foram criadas corretamente:
-- SELECT * FROM pg_policies WHERE tablename = 'users' AND policyname LIKE '%delete%';

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 
-- 1. Row Level Security (RLS):
--    - As políticas RLS são aplicadas automaticamente em todas as operações
--    - Mesmo que o código do cliente tente excluir um usuário, o Supabase
--      verificará as políticas antes de permitir a operação
--
-- 2. Autenticação:
--    - auth.uid() retorna o ID do usuário autenticado no Supabase Auth
--    - Se você está usando autenticação customizada (como no seu app),
--      você pode precisar ajustar a lógica
--
-- 3. Alternativa sem Supabase Auth:
--    - Se você NÃO está usando Supabase Auth, você precisará de uma
--      abordagem diferente, como passar o role via service_role key
--      ou implementar a validação apenas no código do cliente
--
-- 4. Teste as políticas:
--    - Faça login como admin e tente excluir um usuário
--    - Faça login como técnico/cliente e tente excluir (deve falhar)
--    - Tente excluir seu próprio usuário como admin (deve falhar)
--
-- ============================================
-- ALTERNATIVA: Se você NÃO usa Supabase Auth
-- ============================================
--
-- Se você está gerenciando autenticação manualmente (como parece ser o caso),
-- você pode simplesmente DESABILITAR RLS e confiar nas validações do código:

-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Neste caso, a segurança é garantida pelo código do cliente (handleDeleteUser)
-- que já implementa as validações necessárias.
--
-- RECOMENDAÇÃO: Para máxima segurança, use RLS + validações no código.
-- ============================================
