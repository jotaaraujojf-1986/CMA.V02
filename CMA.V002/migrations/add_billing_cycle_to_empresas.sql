-- Adiciona coluna billing_cycle à tabela empresas (mensal ou anual)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly';
