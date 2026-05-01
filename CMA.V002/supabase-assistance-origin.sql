-- Script de criação das colunas para vínculos de Assistência
-- Cole e rode este script no SQL Editor do Supabase

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_post_assembly BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_assembly_work_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_assembly_technician_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_assembly_finished_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS related_environment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "isPostAssembly" BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "relatedAssemblyWorkOrderId" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "relatedAssemblyTechnicianId" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "relatedAssemblyFinishedAt" TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS "relatedEnvironmentId" TEXT;
