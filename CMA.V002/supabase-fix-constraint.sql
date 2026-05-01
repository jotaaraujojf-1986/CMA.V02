-- ============================================
-- CORREÇÃO DEFINITIVA - ASSISTENTE
-- Remove constraint que bloqueia ASSISTANT
-- ============================================

-- PASSO 1: Remover constraint antiga
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- PASSO 2: Adicionar ASSISTANT ao ENUM (se usar ENUM)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        -- Se o enum existir, adicionar ASSISTANT
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'ASSISTANT' 
            AND enumtypid = 'user_role'::regtype
        ) THEN
            ALTER TYPE user_role ADD VALUE 'ASSISTANT';
            RAISE NOTICE 'ASSISTANT adicionado ao enum';
        END IF;
    END IF;
END $$;

-- PASSO 3: Criar nova constraint incluindo ASSISTANT
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('ADMIN', 'TECHNICIAN', 'CLIENT', 'ASSISTANT'));

-- PASSO 4: Desabilitar RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- PASSO 5: Teste
DO $$
DECLARE
    test_id TEXT := 'test-' || floor(random() * 10000)::text;
BEGIN
    INSERT INTO users (id, name, email, password, role, phone, "avatarUrl")
    VALUES (
        test_id,
        'Teste Assistente',
        'teste.' || floor(random() * 10000)::text || '@cma.com',
        '123',
        'ASSISTANT',
        '11999999999',
        'https://ui-avatars.com/api/?name=Teste&background=random'
    );
    
    RAISE NOTICE '✅ SUCESSO! Usuário ASSISTENTE criado: %', test_id;
    
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE '✅ Teste removido';
END $$;

-- PASSO 6: Verificar constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass 
AND conname = 'users_role_check';
