-- ================================================================
-- Migração: Adicionar suporte a alertas toast na tabela notifications
-- Rodar no Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. Adicionas as colunas necessárias para diferenciar notificações toast
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS alert_type TEXT CHECK (alert_type IN ('NEW_ORDER', 'ORDER_UPDATE', 'CHAT_MESSAGE')),
  ADD COLUMN IF NOT EXISTS navigate_to TEXT  CHECK (navigate_to  IN ('DETAILS', 'CHAT'));

-- 2. Índice para acelerar a consulta de notificações não lidas com alert_type
CREATE INDEX IF NOT EXISTS idx_notifications_unread_alert
  ON notifications (user_id, read, alert_type)
  WHERE read = false AND alert_type IS NOT NULL;

-- 3. (Opcional) Política RLS — garante que cada usuário só vê as próprias notificações
-- Se já houver RLS habilitado, basta confirmar a policy abaixo:
-- ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can read own notifications"
--   ON notifications FOR SELECT
--   USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- CREATE POLICY "App can insert notifications"
--   ON notifications FOR INSERT
--   WITH CHECK (true);  -- controlado pelo app (anon key service role)

-- CREATE POLICY "Users can update own notifications (mark as read)"
--   ON notifications FOR UPDATE
--   USING (auth.uid() = (SELECT auth_id FROM users WHERE id = user_id));

-- ================================================================
-- Verificação pós-migração
-- ================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'notifications'
  AND column_name IN ('alert_type', 'navigate_to')
ORDER BY column_name;
