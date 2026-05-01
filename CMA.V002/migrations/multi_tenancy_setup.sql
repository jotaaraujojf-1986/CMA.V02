-- 1. Cria a tabela de empresas
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text,
  plano text DEFAULT 'trial',
  plano_expira_em timestamp with time zone,
  status text DEFAULT 'ativo',
  criado_em timestamp with time zone DEFAULT now()
);

-- 2. Insere a empresa padrão para os dados existentes ("Dommanni")
DO $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Verifica se a empresa Dommanni já existe
  SELECT id INTO v_empresa_id FROM public.empresas WHERE nome = 'Dommanni' LIMIT 1;
  
  IF v_empresa_id IS NULL THEN
    INSERT INTO public.empresas (nome, email) 
    VALUES ('Dommanni', 'contato@dommanni.com.br') 
    RETURNING id INTO v_empresa_id;
  END IF;

  -- 3. Adiciona a coluna empresa_id nas tabelas (permitindo nulo temporariamente)
  
  -- Users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.users ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    UPDATE public.users SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.users ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- Orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.orders ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    UPDATE public.orders SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.orders ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- Comments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'comments' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.comments ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    UPDATE public.comments SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.comments ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- Environments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'environments' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.environments ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    UPDATE public.environments SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.environments ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- Checklist_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'checklist_items' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.checklist_items ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    UPDATE public.checklist_items SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.checklist_items ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- Notifications
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'empresa_id') THEN
    ALTER TABLE public.notifications ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    UPDATE public.notifications SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
    ALTER TABLE public.notifications ALTER COLUMN empresa_id SET NOT NULL;
  END IF;

  -- Audit_logs
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'empresa_id') THEN
      ALTER TABLE public.audit_logs ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
      UPDATE public.audit_logs SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
      ALTER TABLE public.audit_logs ALTER COLUMN empresa_id SET NOT NULL;
    END IF;
  END IF;

  -- Work_order_events
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_order_events') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_order_events' AND column_name = 'empresa_id') THEN
      ALTER TABLE public.work_order_events ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
      UPDATE public.work_order_events SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
      ALTER TABLE public.work_order_events ALTER COLUMN empresa_id SET NOT NULL;
    END IF;
  END IF;

  -- Work_order_event_attachments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_order_event_attachments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_order_event_attachments' AND column_name = 'empresa_id') THEN
      ALTER TABLE public.work_order_event_attachments ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
      UPDATE public.work_order_event_attachments SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
      ALTER TABLE public.work_order_event_attachments ALTER COLUMN empresa_id SET NOT NULL;
    END IF;
  END IF;

  -- System_settings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'system_settings' AND column_name = 'empresa_id') THEN
      ALTER TABLE public.system_settings ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
      UPDATE public.system_settings SET empresa_id = v_empresa_id WHERE empresa_id IS NULL;
      ALTER TABLE public.system_settings ALTER COLUMN empresa_id SET NOT NULL;
      -- Precisamos recriar a constraint caso system_settings usasse "key" como unique
      ALTER TABLE public.system_settings DROP CONSTRAINT IF EXISTS system_settings_key_key;
      ALTER TABLE public.system_settings ADD CONSTRAINT system_settings_key_empresa_unique UNIQUE (key, empresa_id);
    END IF;
  END IF;

END $$;


-- 4. Função global para obter empresa_id do JWT
CREATE OR REPLACE FUNCTION public.get_empresa_atual()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT nullif(current_setting('request.jwt.claims', true)::json->>'empresa_id', '')::uuid;
$$;


-- 5. Função / Hook para injetar o empresa_id no Custom Access Token do Supabase
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
  DECLARE
    claims jsonb;
    v_empresa_id uuid;
  BEGIN
    -- Busca o empresa_id do usuário que está logando
    SELECT empresa_id INTO v_empresa_id FROM public.users WHERE auth_id = (event->>'user_id')::uuid;

    claims := event->'claims';
    
    -- Se o usuário tiver um empresa_id vinculado, injeta no token
    IF v_empresa_id IS NOT NULL THEN
      claims := jsonb_set(claims, '{empresa_id}', to_jsonb(v_empresa_id));
    END IF;

    -- Atualiza o payload do evento com os novos claims
    event := jsonb_set(event, '{claims}', claims);
    
    RETURN event;
  END;
$$;

-- Da permissão para o supabase_auth_admin rodar a função
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb) TO supabase_auth_admin;

-- 6. RPC para setup seguro de nova empresa (Cria Empresa + Vincula Auth User)
CREATE OR REPLACE FUNCTION public.setup_nova_empresa(
  p_auth_id uuid,
  p_user_email text,
  p_user_name text,
  p_empresa_nome text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- 1. Cria a empresa
  INSERT INTO public.empresas (nome, email, plano, status)
  VALUES (p_empresa_nome, p_user_email, 'trial', 'ativo')
  RETURNING id INTO v_empresa_id;

  -- 2. Cria o usuário público associado ao auth_id e à empresa
  -- Presume-se que o Supabase Auth.users já tem o p_auth_id
  INSERT INTO public.users (id, auth_id, name, email, role, classification, active, createdat, empresa_id)
  VALUES (
    gen_random_uuid(),
    p_auth_id,
    p_user_name,
    p_user_email,
    'ADMIN', -- Primeiro usuário da empresa será o ADMIN
    'Pleno',
    true,
    now(),
    v_empresa_id
  );

  RETURN v_empresa_id;
END;
$$;


-- 7. RLS Policies
-- Ativa o RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_event_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas que conflitam com as novas de multi-tenancy
DO $$
DECLARE
  table_list text[] := ARRAY['empresas', 'users', 'orders', 'comments', 'environments', 'checklist_items', 'notifications', 'audit_logs', 'work_order_events', 'work_order_event_attachments', 'system_settings'];
  t text;
BEGIN
  FOREACH t IN ARRAY table_list LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Select_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Insert_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Update_%s" ON public.%s', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant_Delete_%s" ON public.%s', t, t);
  END LOOP;
END $$;

-- Tabela: empresas (Usuário só pode ver sua própria empresa)
CREATE POLICY "Tenant_Select_empresas" ON public.empresas FOR SELECT USING (id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_empresas" ON public.empresas FOR UPDATE USING (id = public.get_empresa_atual());

-- Tabelas comuns: As restrições garantem que todas as operações sejam atadas ao empresa_id da sessão

-- users
CREATE POLICY "Tenant_Select_users" ON public.users FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_users" ON public.users FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_users" ON public.users FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_users" ON public.users FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- orders
CREATE POLICY "Tenant_Select_orders" ON public.orders FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_orders" ON public.orders FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_orders" ON public.orders FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_orders" ON public.orders FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- comments
CREATE POLICY "Tenant_Select_comments" ON public.comments FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_comments" ON public.comments FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_comments" ON public.comments FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_comments" ON public.comments FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- environments
CREATE POLICY "Tenant_Select_environments" ON public.environments FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_environments" ON public.environments FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_environments" ON public.environments FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_environments" ON public.environments FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- checklist_items
CREATE POLICY "Tenant_Select_checklist_items" ON public.checklist_items FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_checklist_items" ON public.checklist_items FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_checklist_items" ON public.checklist_items FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_checklist_items" ON public.checklist_items FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- notifications
CREATE POLICY "Tenant_Select_notifications" ON public.notifications FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_notifications" ON public.notifications FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_notifications" ON public.notifications FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_notifications" ON public.notifications FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- audit_logs
CREATE POLICY "Tenant_Select_audit_logs" ON public.audit_logs FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_audit_logs" ON public.audit_logs FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_audit_logs" ON public.audit_logs FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- work_order_events
CREATE POLICY "Tenant_Select_work_order_events" ON public.work_order_events FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_work_order_events" ON public.work_order_events FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_work_order_events" ON public.work_order_events FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_work_order_events" ON public.work_order_events FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- work_order_event_attachments
CREATE POLICY "Tenant_Select_work_order_event_attachments" ON public.work_order_event_attachments FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_work_order_event_attachments" ON public.work_order_event_attachments FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_work_order_event_attachments" ON public.work_order_event_attachments FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_work_order_event_attachments" ON public.work_order_event_attachments FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- system_settings
CREATE POLICY "Tenant_Select_system_settings" ON public.system_settings FOR SELECT USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Insert_system_settings" ON public.system_settings FOR INSERT WITH CHECK (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Update_system_settings" ON public.system_settings FOR UPDATE USING (empresa_id = public.get_empresa_atual());
CREATE POLICY "Tenant_Delete_system_settings" ON public.system_settings FOR DELETE USING (empresa_id = public.get_empresa_atual());

-- GRANTs necessarios
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
