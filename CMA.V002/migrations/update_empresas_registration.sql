-- Adiciona as colunas novas, caso não existam
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS cidade text;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS numero_tecnicos int;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly';

-- Substitui a RPC para contemplar os novos campos e o trial de 14 dias
CREATE OR REPLACE FUNCTION public.setup_nova_empresa(
  p_auth_id uuid,
  p_user_email text,
  p_user_name text,
  p_empresa_nome text,
  p_cidade text,
  p_numero_tecnicos int,
  p_plano text DEFAULT 'pro',
  p_billing_cycle text DEFAULT 'monthly'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- 1. Cria a empresa
  INSERT INTO public.empresas (nome, email, plano, status, cidade, numero_tecnicos, billing_cycle, plano_expira_em)
  VALUES (
    p_empresa_nome, 
    p_user_email, 
    COALESCE(NULLIF(p_plano, ''), 'pro'),
    'trial', 
    p_cidade, 
    p_numero_tecnicos, 
    COALESCE(NULLIF(p_billing_cycle, ''), 'monthly'),
    now() + interval '14 days' -- 14 dias de teste
  )
  RETURNING id INTO v_empresa_id;

  -- 2. Cria o usuário público associado ao auth_id e à empresa
  INSERT INTO public.users (id, auth_id, name, email, role, classification, empresa_id)
  VALUES (
    gen_random_uuid(),
    p_auth_id,
    p_user_name,
    p_user_email,
    'ADMIN', -- O dono da conta sempre nasce como ADMIN
    'PLENO',
    v_empresa_id
  );

  RETURN v_empresa_id;
END;
$$;
