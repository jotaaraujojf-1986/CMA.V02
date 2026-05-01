-- Diagnóstico completo das políticas RLS ativas no banco
-- Execute no SQL Editor do Supabase

-- 1. Verifica se o RLS está HABILITADO em cada tabela
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('users', 'orders', 'comments', 'environments', 'checklist_items',
                    'notifications', 'audit_logs', 'work_order_events',
                    'work_order_event_attachments', 'system_settings', 'empresas')
ORDER BY tablename;

-- 2. Lista todas as políticas RLS ativas
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('users', 'orders', 'comments', 'environments', 'checklist_items',
                    'notifications', 'audit_logs', 'work_order_events',
                    'work_order_event_attachments', 'system_settings', 'empresas')
ORDER BY tablename, policyname;
