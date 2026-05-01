-- ============================================================
-- CORREÇÃO COMPLETA DO RLS — ServiceFlow Multi-Tenant
-- Execute este arquivo inteiro no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- PARTE 1: FUNÇÕES AUXILIARES COM SECURITY DEFINER
-- (Rodam com privilégios elevados, contornam o RLS nas buscas internas)
-- ============================================================

-- Função que retorna o empresa_id do usuário logado, sem ser bloqueada pelo RLS
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  RETURN v_empresa_id;
END;
$$;

-- Função que verifica se o usuário logado é SUPERADMIN, sem ser bloqueada pelo RLS
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1;
  RETURN v_role = 'SUPERADMIN';
END;
$$;

-- Concede permissão de execução das funções para usuários autenticados e anônimos
GRANT EXECUTE ON FUNCTION public.get_auth_empresa_id() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_superadmin() TO authenticated, anon, service_role;

-- Concede acesso ao schema public para o supabase_auth_admin (necessário para o hook de auth)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT SELECT ON public.users TO supabase_auth_admin;
GRANT SELECT ON public.empresas TO supabase_auth_admin;

-- ============================================================
-- PARTE 2: POLÍTICAS RLS NA TABELA users
-- A tabela users tem tratamento especial pois é usada no próprio RLS das outras tabelas
-- ============================================================

-- Remove políticas antigas
DROP POLICY IF EXISTS "Tenant_Select_users" ON public.users;
DROP POLICY IF EXISTS "Tenant_Insert_users" ON public.users;
DROP POLICY IF EXISTS "Tenant_Update_users" ON public.users;
DROP POLICY IF EXISTS "Tenant_Delete_users" ON public.users;
DROP POLICY IF EXISTS "superadmin_acesso_total" ON public.users;
DROP POLICY IF EXISTS "usuario_pode_ver_proprio_perfil" ON public.users;
DROP POLICY IF EXISTS "usuario_pode_atualizar_proprio_perfil" ON public.users;

-- Permite que qualquer usuário veja o PRÓPRIO perfil pelo auth_id (essencial para o login funcionar)
CREATE POLICY "usuario_pode_ver_proprio_perfil" ON public.users
  FOR SELECT
  USING (auth_id = auth.uid());

-- Permite que qualquer usuário atualize o PRÓPRIO perfil (necessário para vincular auth_id)
CREATE POLICY "usuario_pode_atualizar_proprio_perfil" ON public.users
  FOR UPDATE
  USING (auth_id = auth.uid());

-- Permite que usuários do mesmo tenant vejam e gerenciem colegas
CREATE POLICY "Tenant_Select_users" ON public.users
  FOR SELECT
  USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "Tenant_Insert_users" ON public.users
  FOR INSERT
  WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "Tenant_Update_users" ON public.users
  FOR UPDATE
  USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "Tenant_Delete_users" ON public.users
  FOR DELETE
  USING (empresa_id = public.get_auth_empresa_id());

-- SUPERADMIN tem acesso total a todos os registros
CREATE POLICY "superadmin_acesso_total" ON public.users
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================
-- PARTE 3: POLÍTICAS RLS NAS DEMAIS TABELAS
-- Recria as políticas tenant + superadmin bypass
-- ============================================================

DO $$
DECLARE
  table_list text[] := ARRAY[
    'orders', 'comments', 'environments', 'checklist_items',
    'notifications', 'audit_logs', 'work_order_events',
    'work_order_event_attachments', 'system_settings'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    -- Remove antigas
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Select_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Insert_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Update_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Delete_%s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_acesso_total" ON public.%I', t);

    -- Políticas por tenant
    EXECUTE format(
      'CREATE POLICY "Tenant_Select_%s" ON public.%I FOR SELECT USING (empresa_id = public.get_auth_empresa_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Tenant_Insert_%s" ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_auth_empresa_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Tenant_Update_%s" ON public.%I FOR UPDATE USING (empresa_id = public.get_auth_empresa_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "Tenant_Delete_%s" ON public.%I FOR DELETE USING (empresa_id = public.get_auth_empresa_id())',
      t, t
    );

    -- Bypass total para SUPERADMIN
    EXECUTE format(
      'CREATE POLICY "superadmin_acesso_total" ON public.%I FOR ALL USING (public.is_superadmin()) WITH CHECK (public.is_superadmin())',
      t
    );
  END LOOP;
END $$;

-- ============================================================
-- PARTE 4: POLÍTICAS RLS NA TABELA empresas
-- ============================================================

DROP POLICY IF EXISTS "Tenant_Select_empresas" ON public.empresas;
DROP POLICY IF EXISTS "Tenant_Update_empresas" ON public.empresas;
DROP POLICY IF EXISTS "superadmin_acesso_total" ON public.empresas;

-- Tenant vê apenas a própria empresa
CREATE POLICY "Tenant_Select_empresas" ON public.empresas
  FOR SELECT
  USING (id = public.get_auth_empresa_id());

CREATE POLICY "Tenant_Update_empresas" ON public.empresas
  FOR UPDATE
  USING (id = public.get_auth_empresa_id());

-- SUPERADMIN vê e gerencia todas as empresas
CREATE POLICY "superadmin_acesso_total" ON public.empresas
  FOR ALL
  USING (public.is_superadmin())
  WITH CHECK (public.is_superadmin());

-- ============================================================
-- PARTE 5: RELOAD DO CACHE
-- ============================================================

NOTIFY pgrst, 'reload schema';
