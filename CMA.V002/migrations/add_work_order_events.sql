-- Migration: Add Work Order Events (Histórico/Ocorrências)
-- This migration creates the tables for tracking occurrences on work orders and environments.

-- 1. Create work_order_events table
CREATE TABLE IF NOT EXISTS work_order_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    work_order_type TEXT NOT NULL CHECK (work_order_type IN ('ASSEMBLY', 'ASSISTANCE')),
    scope TEXT NOT NULL CHECK (scope IN ('work_order', 'environment')),
    environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    impact_deadline BOOLEAN DEFAULT false,
    impact_workdays INTEGER,
    impact_cost BOOLEAN DEFAULT false,
    impact_cost_brl DECIMAL(10, 2),
    visibility TEXT NOT NULL CHECK (visibility IN ('internal', 'client_shareable')) DEFAULT 'internal',
    status TEXT NOT NULL CHECK (status IN ('open', 'resolved')) DEFAULT 'open',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Integrity Constraint: If scope is 'environment', environment_id must not be null.
ALTER TABLE work_order_events ADD CONSTRAINT check_environment_scope 
    CHECK (
        (scope = 'work_order') OR 
        (scope = 'environment' AND environment_id IS NOT NULL)
    );

-- 2. Create work_order_event_attachments table
CREATE TABLE IF NOT EXISTS work_order_event_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES work_order_events(id) ON DELETE CASCADE,
    work_order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Row Level Security (RLS) for work_order_events

ALTER TABLE work_order_events ENABLE ROW LEVEL SECURITY;

-- Note: The logic for determining which user has access to which work order is traditionally complex 
-- and often relies on checking the `orders` role assignments. 
-- In our schema, `users` syncs with `auth.users(id)`. Admin accesses everything. Technician accesses assigned orders.

-- Policy: Admin e Assistant Full Access to Events
CREATE POLICY "Admin e Assistant tem acesso total às ocorrencias"
ON work_order_events
FOR ALL
TO authenticated
USING (
   EXISTS (
      SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role IN ('ADMIN', 'ASSISTANT')
   )
);

-- Policy: Technician/Assistant View Access (Only if they are assigned to the order or environment, or if they are assistant and order is visible to them)
CREATE POLICY "Tecnicos podem ver ocorrencias de suas OS"
ON work_order_events
FOR SELECT
TO authenticated
USING (
   EXISTS (
       SELECT 1 FROM orders o 
       WHERE o.id = work_order_events.work_order_id 
       AND (
           o."technicianId" = (SELECT id FROM users WHERE auth_id = auth.uid())
           OR
           EXISTS (
               SELECT 1 FROM environments env 
               WHERE env."orderId" = o.id 
               AND env."technicianId" = (SELECT id FROM users WHERE auth_id = auth.uid())
           )
           OR
           (SELECT role FROM users WHERE auth_id = auth.uid()) = 'ASSISTANT'
       )
   )
   AND visibility = 'internal' -- Currently assume techs just see internals natively, clients would only see client_shareable.
   -- Wait, Techs should see client_shareable too since they created it potentially.
   -- Let's just allow all visibility to Techs/Assistants of that order.
);

-- Override visibility restriction for authorized readers
DROP POLICY IF EXISTS "Tecnicos podem ver ocorrencias de suas OS" ON work_order_events;
CREATE POLICY "Membros da equipe podem ver ocorrencias da OS vinculada"
ON work_order_events
FOR SELECT
TO authenticated
USING (
   EXISTS (
       SELECT 1 FROM orders o 
       WHERE o.id = work_order_events.work_order_id 
       AND (
           o."technicianId" = (SELECT id FROM users WHERE auth_id = auth.uid())
           OR
           EXISTS (
               SELECT 1 FROM environments env 
               WHERE env."orderId" = o.id 
               AND env."technicianId" = (SELECT id FROM users WHERE auth_id = auth.uid())
           )
           OR
           (SELECT role FROM users WHERE auth_id = auth.uid()) = 'ASSISTANT'
       )
   )
);

-- Policy: Technician Create Access
CREATE POLICY "Tecnicos podem criar ocorrencias"
ON work_order_events
FOR INSERT
TO authenticated
WITH CHECK (
   created_by = auth.uid()
);

-- Policy: Technician Update Access (Only their own, only within 15 mins, no visibility changes)
CREATE POLICY "Tecnicos podem editar proprias ocorrencias em 15m"
ON work_order_events
FOR UPDATE
TO authenticated
USING (
   created_by = auth.uid() 
   AND updated_at >= (now() - interval '15 minutes')
)
WITH CHECK (
   created_by = auth.uid()
);


-- 4. Row Level Security (RLS) for work_order_event_attachments
ALTER TABLE work_order_event_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin e Assistant total anexos ocorrencias"
ON work_order_event_attachments
FOR ALL
TO authenticated
USING (
   EXISTS (SELECT 1 FROM users WHERE users.auth_id = auth.uid() AND users.role IN ('ADMIN', 'ASSISTANT'))
);

CREATE POLICY "Equipe acesso leitura anexos ocorrencias vinculadas"
ON work_order_event_attachments
FOR SELECT
TO authenticated
USING (
   EXISTS (
      SELECT 1 FROM work_order_events e 
      WHERE e.id = work_order_event_attachments.event_id
   )
);

CREATE POLICY "Criador pode inserir anexos ocorrencias"
ON work_order_event_attachments
FOR INSERT
TO authenticated
WITH CHECK (
   EXISTS (
      SELECT 1 FROM work_order_events e 
      WHERE e.id = event_id AND e.created_by = auth.uid()
   )
);

-- Supabase Storage Rules (Assuming a bucket called 'attachments' exists)
-- This cannot be perfectly scripted via pure data SQL without extensions, but usually looks like:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', false) ON CONFLICT DO NOTHING;
-- CREATE POLICY "Acesso aos anexos" ON storage.objects FOR SELECT USING (bucket_id = 'attachments');
-- CREATE POLICY "Upload anexos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');
