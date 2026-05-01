-- Correção: FK de audit_logs -> orders sem ON DELETE SET NULL
-- Causa: ao excluir uma O.S. que possui entradas de auditoria, o banco
-- retornava violação de foreign key impedindo a exclusão.

-- Passo 1: Descobrir o nome exato da constraint (para diagnóstico)
SELECT conname
FROM pg_constraint
WHERE conrelid = 'audit_logs'::regclass
  AND confrelid = 'orders'::regclass;

-- Passo 2: Remover a constraint antiga (tenta os dois nomes mais prováveis)
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS "audit_logs_orderId_fkey";
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_orderId_fkey;

-- Passo 3: Recriar com ON DELETE SET NULL
--   SET NULL preserva o log de auditoria mas remove a referência ao pedido excluído,
--   mantendo conformidade com LGPD (registro da ação sem vínculo ao objeto deletado).
ALTER TABLE public.audit_logs
  ADD CONSTRAINT "audit_logs_orderId_fkey"
  FOREIGN KEY ("orderId")
  REFERENCES public.orders(id)
  ON DELETE SET NULL;

-- Confirmação
SELECT conname, confupdtype, confdeltype
FROM pg_constraint
WHERE conrelid = 'audit_logs'::regclass
  AND confrelid = 'orders'::regclass;
-- confdeltype = 'a' → NO ACTION (antigo/errado)
-- confdeltype = 'n' → SET NULL (correto após a correção)

NOTIFY pgrst, 'reload schema';
