-- Políticas de acesso total para SUPERADMIN em todas as tabelas
-- Isso permite que o SUPERADMIN acesse dados de qualquer empresa sem filtro de empresa_id

DO $$
DECLARE
  table_list text[] := ARRAY[
    'users', 'orders', 'comments', 'environments', 'checklist_items',
    'notifications', 'audit_logs', 'work_order_events',
    'work_order_event_attachments', 'system_settings'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_acesso_total" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "superadmin_acesso_total" ON public.%I
       FOR ALL
       USING (EXISTS (
         SELECT 1 FROM public.users
         WHERE auth_id = auth.uid() AND role = ''SUPERADMIN''
       ))
       WITH CHECK (EXISTS (
         SELECT 1 FROM public.users
         WHERE auth_id = auth.uid() AND role = ''SUPERADMIN''
       ))',
      t
    );
  END LOOP;
END $$;

-- Política separada para a tabela de empresas (usa "id" ao invés de "empresa_id")
DROP POLICY IF EXISTS "superadmin_acesso_total" ON public.empresas;
CREATE POLICY "superadmin_acesso_total" ON public.empresas
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'SUPERADMIN'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'SUPERADMIN'
  ));

-- Recarregar o schema
NOTIFY pgrst, 'reload schema';
