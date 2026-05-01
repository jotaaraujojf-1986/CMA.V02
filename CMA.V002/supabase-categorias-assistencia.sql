-- Script de criacao das colunas para os padroes de falha nas Assistencias (Pos-Montagem)
-- Cole e rode este script no SQL Editor do Supabase

ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_environment_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assistance_category TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assistance_category_detail TEXT;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS "relatedEnvironmentName" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "assistanceCategory" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "assistanceCategoryDetail" TEXT;
