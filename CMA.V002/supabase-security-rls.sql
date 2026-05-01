
-- 1. ATUALIZAÇÕES NAS TABELAS EXISTENTES
-- ============================================

-- A. Lincagem do usuário local com a tabela auth.users nativa do Supabase
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);

-- B. Vinculação expressa do Cliente na O.S. (para não depender apenas do nome/email)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "clientId" TEXT REFERENCES users(id);

-- Opcional: Popular clientId baseado no clientEmail para ordens existentes
UPDATE orders 
SET "clientId" = u.id 
FROM users u 
WHERE orders."clientEmail" = u.email AND orders."clientId" IS NULL;


-- 2. CRIAÇÃO DA TABELA AUDIT_LOGS (LGPD COMPLIANT)
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    "userId" TEXT REFERENCES users(id),
    action TEXT NOT NULL,
    "orderId" TEXT REFERENCES orders(id),
    details JSONB,
    "timestamp" TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNÇÕES UTILITÁRIAS PARA RLS
-- ============================================

-- Retorna a role do usuário conectando
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT role::TEXT INTO v_role FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Retorna o ID de texto da tabela public.users baseado no token JWT
CREATE OR REPLACE FUNCTION get_public_user_id() RETURNS TEXT AS $$
DECLARE
  v_id TEXT;
BEGIN
  SELECT id INTO v_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. HABILITANDO RLS (ROW LEVEL SECURITY)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;


-- 5. POLICIES (REGRAS DE ACESSO)
-- ATENÇÃO: Administradores e Assistentes ganham bypass pela Role.
-- Técnicos veem apenas as suas OS. Clientes veem apenas as suas OS.
-- ============================================

-- ----------------- USERS -----------------
DROP POLICY IF EXISTS "Usuários podem ver seu proprio perfil ou admins veem tudo" ON users;
CREATE POLICY "Usuários podem ver seu proprio perfil ou admins veem tudo" ON users 
FOR SELECT USING (
  auth_id = auth.uid() OR 
  get_user_role() IN ('ADMIN', 'ASSISTANT')
);

DROP POLICY IF EXISTS "Apenas admins e assistentes podem gerenciar usuários" ON users;
CREATE POLICY "Apenas admins e assistentes podem gerenciar usuários" ON users 
FOR ALL USING (
  get_user_role() IN ('ADMIN', 'ASSISTANT')
) WITH CHECK (
  get_user_role() IN ('ADMIN', 'ASSISTANT')
);

-- Para permitir o cadastro inicial (pelo client do usuário anônimo logo ao signUp), 
-- podemos liberar inserções desde que referenciem o auth_id ativo.
CREATE POLICY "Permitir auto-cadastro" ON users 
FOR INSERT WITH CHECK (
  auth_id = auth.uid() OR get_user_role() IN ('ADMIN', 'ASSISTANT')
);


-- ----------------- ORDERS -----------------
-- ADMIN e ASSISTANT: TUDO
-- TECHNICIAN: Apenas ordens onde technicianId = publicUser
-- CLIENT: Apenas ordens onde clientId = publicUser
DROP POLICY IF EXISTS "Visualização de OS baseada em permissão" ON orders;
CREATE POLICY "Visualização de OS baseada em permissão" ON orders 
FOR SELECT USING (
  get_user_role() IN ('ADMIN', 'ASSISTANT') OR
  "technicianId" = get_public_user_id() OR
  "clientId" = get_public_user_id()
);

DROP POLICY IF EXISTS "Manipulação de OS baseada em permissão" ON orders;
CREATE POLICY "Manipulação de OS baseada em permissão" ON orders 
FOR UPDATE USING (
  get_user_role() IN ('ADMIN', 'ASSISTANT') OR
  "technicianId" = get_public_user_id() OR
  "clientId" = get_public_user_id()
);

DROP POLICY IF EXISTS "Criação de OS" ON orders;
CREATE POLICY "Criação de OS" ON orders 
FOR INSERT WITH CHECK (
  get_user_role() IN ('ADMIN', 'ASSISTANT') OR
  "clientId" = get_public_user_id()
);

DROP POLICY IF EXISTS "Deleção de OS" ON orders;
CREATE POLICY "Deleção de OS" ON orders 
FOR DELETE USING (
  get_user_role() IN ('ADMIN', 'ASSISTANT')
);

-- ----------------- ESTRUTURAS HERDADAS (ENVIRONMENTS, COMMENTS, ETC) -----------------
-- Como comments e environments dependem do orderId, vamos buscar permissão na OS pai.

CREATE OR REPLACE FUNCTION check_order_access(p_order_id TEXT) RETURNS BOOLEAN AS $$
DECLARE
  v_role TEXT := get_user_role();
  v_uid TEXT := get_public_user_id();
  v_has_access BOOLEAN;
BEGIN
  IF v_role IN ('ADMIN', 'ASSISTANT') THEN RETURN TRUE; END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM orders 
    WHERE id = p_order_id 
    AND ("clientId" = v_uid OR "technicianId" = v_uid)
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
DROP POLICY IF EXISTS "Acesso a comments baseado em OS" ON comments;
CREATE POLICY "Acesso a comments baseado em OS" ON comments 
FOR ALL USING ( check_order_access("orderId") ) WITH CHECK ( check_order_access("orderId") );

-- Ambientes
DROP POLICY IF EXISTS "Acesso a environments baseado em OS" ON environments;
CREATE POLICY "Acesso a environments baseado em OS" ON environments 
FOR ALL USING ( check_order_access("orderId") ) WITH CHECK ( check_order_access("orderId") );

-- Checklist
DROP POLICY IF EXISTS "Acesso a checklist_items baseado em OS e Env" ON checklist_items;
CREATE POLICY "Acesso a checklist_items baseado em OS e Env" ON checklist_items 
FOR ALL USING ( 
  ("orderId" IS NOT NULL AND check_order_access("orderId")) OR
  ("environmentId" IS NOT NULL AND check_order_access( (SELECT "orderId" FROM environments WHERE id = "environmentId" LIMIT 1) ))
) WITH CHECK (
  ("orderId" IS NOT NULL AND check_order_access("orderId")) OR
  ("environmentId" IS NOT NULL AND check_order_access( (SELECT "orderId" FROM environments WHERE id = "environmentId" LIMIT 1) ))
);

-- Notificações
DROP POLICY IF EXISTS "Notificações apenas pro dono" ON notifications;
CREATE POLICY "Notificações apenas pro dono" ON notifications 
FOR SELECT USING ( "userId" = get_public_user_id() OR get_user_role() IN ('ADMIN', 'ASSISTANT') );

-- Audit Logs (Apenas inserções para clients/techs, e select para admins)
DROP POLICY IF EXISTS "Audit logs ins/sel" ON audit_logs;
CREATE POLICY "Visualizar Auditoria (Admin)" ON audit_logs FOR SELECT USING ( get_user_role() = 'ADMIN' );
CREATE POLICY "Inserir na Auditoria" ON audit_logs FOR INSERT WITH CHECK ( "userId" = get_public_user_id() );


-- 6. CONFIGURAÇÃO DE BUCKET STORAGE
-- ============================================

-- Habilitar a extensão storage (normalmente já ativada)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('work_order_attachments', 'work_order_attachments', false, false, 10485760, '{image/jpeg, image/png, application/pdf}')
ON CONFLICT (id) DO UPDATE SET public = false;

-- RLS para Storage (apenas autenticados podem interagir baseado no UUID)
CREATE POLICY "Storage - Visualização Geral Autenticada" ON storage.objects FOR SELECT USING ( bucket_id = 'work_order_attachments' AND auth.role() = 'authenticated' );
CREATE POLICY "Storage - Inserção Autenticada" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'work_order_attachments' AND auth.role() = 'authenticated' );
