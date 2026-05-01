-- Correção: todas as FKs que referenciam users(id) sem ON DELETE definido
-- Causa: excluir um usuário falha se existirem registros vinculados nas tabelas abaixo.

-- ============================================================
-- DIAGNÓSTICO: lista todas as FKs que apontam para users(id)
-- (execute primeiro para ver o estado atual)
-- ============================================================
SELECT
  tc.table_name,
  kcu.column_name,
  rc.constraint_name,
  rc.delete_rule
FROM information_schema.referential_constraints rc
JOIN information_schema.table_constraints tc
  ON rc.constraint_name = tc.constraint_name
JOIN information_schema.key_column_usage kcu
  ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
  AND ccu.column_name = 'id'
ORDER BY tc.table_name;

-- ============================================================
-- CORREÇÃO 1: audit_logs."userId" → SET NULL
--   (preserva o log de auditoria, apenas perde a referência ao usuário)
-- ============================================================
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS "audit_logs_userId_fkey";
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_userId_fkey;

ALTER TABLE public.audit_logs
  ADD CONSTRAINT "audit_logs_userId_fkey"
  FOREIGN KEY ("userId")
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ============================================================
-- CORREÇÃO 2: orders."clientId" → SET NULL
--   (preserva a O.S., apenas perde o vínculo com o cliente excluído)
-- ============================================================
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_clientId_fkey";
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_clientId_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT "orders_clientId_fkey"
  FOREIGN KEY ("clientId")
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- ============================================================
-- CORREÇÃO 3: notifications."userId" → CASCADE DELETE
--   (notificações pertencem ao usuário; sem o usuário não fazem sentido)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'userId'
  ) THEN
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS "notifications_userId_fkey";
    ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_userId_fkey;

    ALTER TABLE public.notifications
      ADD CONSTRAINT "notifications_userId_fkey"
      FOREIGN KEY ("userId")
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- delete_rule deve ser 'SET NULL' para audit_logs e orders,
-- e 'CASCADE' para notifications
-- ============================================================
SELECT
  tc.table_name,
  kcu.column_name,
  rc.constraint_name,
  rc.delete_rule
FROM information_schema.referential_constraints rc
JOIN information_schema.table_constraints tc
  ON rc.constraint_name = tc.constraint_name
JOIN information_schema.key_column_usage kcu
  ON rc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
  AND ccu.column_name = 'id'
ORDER BY tc.table_name;

NOTIFY pgrst, 'reload schema';
