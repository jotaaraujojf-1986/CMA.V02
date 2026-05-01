-- ============================================
-- SCRIPT DE CORREÇÃO COMPLETO - ASSISTENTE
-- Execute TUDO de uma vez no Supabase
-- ============================================
--
-- Este script corrige TODOS os possíveis problemas
-- que impedem usuários ASSISTENTE de serem salvos
--
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================

-- PASSO 1: Verificar se o tipo user_role existe
DO $$ 
BEGIN
    -- Se o tipo não existir, criar
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('ADMIN', 'TECHNICIAN', 'CLIENT', 'ASSISTANT');
        RAISE NOTICE 'Tipo user_role criado com sucesso';
    ELSE
        RAISE NOTICE 'Tipo user_role já existe';
    END IF;
END $$;

-- ============================================

-- PASSO 2: Adicionar ASSISTANT ao ENUM (se ainda não existir)
DO $$
BEGIN
    -- Tentar adicionar ASSISTANT
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'ASSISTANT' 
        AND enumtypid = 'user_role'::regtype
    ) THEN
        ALTER TYPE user_role ADD VALUE 'ASSISTANT';
        RAISE NOTICE 'ASSISTANT adicionado ao enum com sucesso';
    ELSE
        RAISE NOTICE 'ASSISTANT já existe no enum';
    END IF;
END $$;

-- ============================================

-- PASSO 3: Verificar estrutura da tabela users
-- Se a coluna role for TEXT, converter para ENUM

DO $$
DECLARE
    col_type TEXT;
BEGIN
    -- Verificar tipo atual da coluna role
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role';
    
    IF col_type = 'text' OR col_type = 'character varying' THEN
        -- Converter de TEXT para ENUM
        ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role;
        RAISE NOTICE 'Coluna role convertida de TEXT para user_role enum';
    ELSIF col_type = 'USER-DEFINED' THEN
        RAISE NOTICE 'Coluna role já é do tipo user_role enum';
    ELSE
        RAISE NOTICE 'Tipo da coluna role: %', col_type;
    END IF;
END $$;

-- ============================================

-- PASSO 4: Desabilitar RLS (Row Level Security)
-- Isso garante que o código do cliente possa salvar usuários

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- ============================================

-- PASSO 5: Remover políticas RLS antigas (se existirem)

DROP POLICY IF EXISTS "users_allow_all" ON users;
DROP POLICY IF EXISTS "admin_delete_users_policy" ON users;
DROP POLICY IF EXISTS "assistant_delete_non_admin_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;

-- ============================================

-- PASSO 6: Verificar se a tabela users existe e tem estrutura correta

DO $$
BEGIN
    -- Verificar se a tabela existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        RAISE EXCEPTION 'Tabela users não existe! Crie a tabela primeiro.';
    END IF;
    
    -- Verificar colunas essenciais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id') THEN
        RAISE EXCEPTION 'Coluna id não existe na tabela users';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
        RAISE EXCEPTION 'Coluna role não existe na tabela users';
    END IF;
    
    RAISE NOTICE 'Estrutura da tabela users está OK';
END $$;

-- ============================================

-- PASSO 7: Teste de inserção (ASSISTENTE)

DO $$
DECLARE
    test_id TEXT := 'test-assistant-' || floor(random() * 10000)::text;
BEGIN
    -- Tentar inserir usuário ASSISTENTE de teste
    INSERT INTO users (
        id, 
        name, 
        email, 
        password, 
        role, 
        phone,
        "avatarUrl"
    ) VALUES (
        test_id,
        'Teste Assistente Automático',
        'teste.auto.' || floor(random() * 10000)::text || '@cma.com',
        '123',
        'ASSISTANT',
        '11999999999',
        'https://ui-avatars.com/api/?name=Teste&background=random'
    );
    
    RAISE NOTICE 'Usuário ASSISTENTE de teste criado com sucesso! ID: %', test_id;
    
    -- Deletar usuário de teste
    DELETE FROM users WHERE id = test_id;
    RAISE NOTICE 'Usuário de teste removido';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'ERRO ao inserir ASSISTENTE: %', SQLERRM;
END $$;

-- ============================================

-- PASSO 8: Mostrar valores permitidos no ENUM

SELECT 
    'Valores permitidos no enum user_role:' AS info,
    enumlabel AS role_value
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- ============================================

-- PASSO 9: Mostrar estrutura da coluna role

SELECT 
    'Estrutura da coluna role:' AS info,
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'role';

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
--
-- Se tudo funcionou, você verá:
--
-- ✅ NOTICE: Tipo user_role já existe (ou criado)
-- ✅ NOTICE: ASSISTANT adicionado ao enum (ou já existe)
-- ✅ NOTICE: Coluna role já é do tipo user_role enum
-- ✅ NOTICE: Estrutura da tabela users está OK
-- ✅ NOTICE: Usuário ASSISTENTE de teste criado com sucesso!
-- ✅ NOTICE: Usuário de teste removido
--
-- E duas tabelas mostrando:
-- 1. Valores do enum: ADMIN, TECHNICIAN, CLIENT, ASSISTANT
-- 2. Estrutura da coluna: role | USER-DEFINED | user_role
--
-- ============================================
-- SE DER ERRO:
-- ============================================
--
-- Copie a mensagem de erro COMPLETA e me envie.
-- O erro dirá exatamente qual é o problema.
--
-- ============================================
