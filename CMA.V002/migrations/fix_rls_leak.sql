-- ==========================================
-- SCRIPT DE CORREÇÃO DO VAZAMENTO DE DADOS (RLS)
-- ==========================================

-- 1. Remover TODAS as políticas antigas ou permissivas ("Enable read access for all users")
-- que estão permitindo que os dados vazem entre as empresas.
DO $$
DECLARE
  table_list text[] := ARRAY['empresas', 'users', 'orders', 'comments', 'environments', 'checklist_items', 'notifications', 'audit_logs', 'work_order_events', 'work_order_event_attachments', 'system_settings'];
  t text;
  r RECORD;
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname NOT LIKE 'Tenant_%'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- 2. Criar uma função dinâmica e 100% segura para obter a empresa do usuário logado.
-- (Buscamos diretamente no banco de dados para evitar atrasos no Token JWT no primeiro login)
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- Roda com privilégios para não causar loop infinito
AS $$
  SELECT empresa_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 3. Recriar a política da tabela Empresas
DROP POLICY IF EXISTS "Tenant_Select_empresas" ON public.empresas;
DROP POLICY IF EXISTS "Tenant_Update_empresas" ON public.empresas;
CREATE POLICY "Tenant_Select_empresas" ON public.empresas FOR SELECT USING (id = public.get_auth_empresa_id());
CREATE POLICY "Tenant_Update_empresas" ON public.empresas FOR UPDATE USING (id = public.get_auth_empresa_id());

-- 4. Recriar todas as políticas restritivas nas demais tabelas usando a nova função segura
DO $$
DECLARE
  table_list text[] := ARRAY['users', 'orders', 'comments', 'environments', 'checklist_items', 'notifications', 'audit_logs', 'work_order_events', 'work_order_event_attachments', 'system_settings'];
  t text;
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    -- Remove as antigas
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Select_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Insert_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Update_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Delete_%s" ON public.%s', t, t);

    -- Cria as novas com bloqueio estrito
    EXECUTE format('CREATE POLICY "Tenant_Select_%s" ON public.%s FOR SELECT USING (empresa_id = public.get_auth_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY "Tenant_Insert_%s" ON public.%s FOR INSERT WITH CHECK (empresa_id = public.get_auth_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY "Tenant_Update_%s" ON public.%s FOR UPDATE USING (empresa_id = public.get_auth_empresa_id())', t, t);
    EXECUTE format('CREATE POLICY "Tenant_Delete_%s" ON public.%s FOR DELETE USING (empresa_id = public.get_auth_empresa_id())', t, t);
  END LOOP;
END $$;
