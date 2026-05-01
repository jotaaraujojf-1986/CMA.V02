-- CORREÇÃO CRÍTICA DE SEGURANÇA — Multi-Tenant Isolation
-- Garante que RLS está ATIVO e remove TODAS as políticas antigas antes de recriar

-- ============================================================
-- PASSO 1: HABILITA RLS EM TODAS AS TABELAS
-- ============================================================
ALTER TABLE public.users                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_events            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas                     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PASSO 2: REMOVE *TODAS* AS POLÍTICAS EXISTENTES
-- (Elimina qualquer política permissiva antiga com nome diferente)
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'users', 'orders', 'comments', 'environments', 'checklist_items',
        'notifications', 'audit_logs', 'work_order_events',
        'work_order_event_attachments', 'system_settings', 'empresas'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- PASSO 3: FUNÇÕES AUXILIARES (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
  SELECT empresa_id INTO v FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text;
BEGIN
  SELECT role INTO v FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v = 'SUPERADMIN';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_empresa_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, anon, service_role;

-- ============================================================
-- PASSO 4: POLÍTICAS DA TABELA users (tratamento especial)
-- ============================================================

-- Login: o usuário precisa ler o próprio perfil pelo auth_id
CREATE POLICY "proprio_perfil_select" ON public.users
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "proprio_perfil_update" ON public.users
  FOR UPDATE USING (auth_id = auth.uid());

-- Isolamento por tenant
CREATE POLICY "tenant_select_users" ON public.users
  FOR SELECT USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "tenant_insert_users" ON public.users
  FOR INSERT WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "tenant_update_users" ON public.users
  FOR UPDATE USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "tenant_delete_users" ON public.users
  FOR DELETE USING (empresa_id = public.get_auth_empresa_id());

-- Superadmin tem acesso total
CREATE POLICY "superadmin_users" ON public.users
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- ============================================================
-- PASSO 5: POLÍTICAS NAS DEMAIS TABELAS
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'orders', 'comments', 'environments', 'checklist_items',
    'notifications', 'audit_logs', 'work_order_events',
    'work_order_event_attachments', 'system_settings'
  ] LOOP
    EXECUTE format('CREATE POLICY "tenant_select" ON public.%I FOR SELECT USING (empresa_id = public.get_auth_empresa_id())', t);
    EXECUTE format('CREATE POLICY "tenant_insert" ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_auth_empresa_id())', t);
    EXECUTE format('CREATE POLICY "tenant_update" ON public.%I FOR UPDATE USING (empresa_id = public.get_auth_empresa_id())', t);
    EXECUTE format('CREATE POLICY "tenant_delete" ON public.%I FOR DELETE USING (empresa_id = public.get_auth_empresa_id())', t);
    EXECUTE format('CREATE POLICY "superadmin_all" ON public.%I FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())', t);
  END LOOP;
END $$;

-- ============================================================
-- PASSO 6: POLÍTICAS DA TABELA empresas
-- ============================================================
CREATE POLICY "tenant_select_empresas" ON public.empresas
  FOR SELECT USING (id = public.get_auth_empresa_id());

CREATE POLICY "tenant_update_empresas" ON public.empresas
  FOR UPDATE USING (id = public.get_auth_empresa_id());

CREATE POLICY "superadmin_empresas" ON public.empresas
  FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin());

-- ============================================================
-- PASSO 7: RELOAD DO CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';
