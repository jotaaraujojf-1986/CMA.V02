-- Adiciona a coluna plano_status se não existir
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS plano_status text DEFAULT 'ativo';

-- RPC: Obter todas as empresas (Bypass RLS) exclusivo para SUPERADMIN
CREATE OR REPLACE FUNCTION public.get_all_empresas_for_superadmin()
RETURNS setof public.empresas
LANGUAGE plpgsql
SECURITY DEFINER -- Permite bypass no RLS executando como admin do banco
AS $$
BEGIN
  -- Como o banco não tem uma forma nativa de checar se o token JWT tem role 'SUPERADMIN', 
  -- checamos na tabela users
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'SUPERADMIN'
  ) THEN
    RETURN QUERY SELECT * FROM public.empresas ORDER BY criado_em DESC;
  ELSE
    RAISE EXCEPTION 'Acesso negado: Requer perfil SUPERADMIN';
  END IF;
END;
$$;

-- RPC: Atualizar o plano de uma empresa (Exclusivo para SUPERADMIN)
CREATE OR REPLACE FUNCTION public.update_empresa_plan(
  p_empresa_id uuid,
  p_novo_plano text,
  p_novo_status text,
  p_expira_em timestamp
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'SUPERADMIN'
  ) THEN
    UPDATE public.empresas 
    SET 
      plano = p_novo_plano, 
      plano_status = p_novo_status, 
      plano_expira_em = p_expira_em
    WHERE id = p_empresa_id;
  ELSE
    RAISE EXCEPTION 'Acesso negado: Requer perfil SUPERADMIN';
  END IF;
END;
$$;

-- RPC para obter contagem de usuarios por empresa (para o dashboard superadmin)
CREATE OR REPLACE FUNCTION public.get_users_count_by_empresa()
RETURNS TABLE (
  empresa_id uuid,
  total_admins bigint,
  total_tecnicos bigint,
  total_assistentes bigint,
  total_clientes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
      AND role = 'SUPERADMIN'
  ) THEN
    RETURN QUERY 
    SELECT 
      u.empresa_id,
      COUNT(CASE WHEN role = 'ADMIN' THEN 1 END) as total_admins,
      COUNT(CASE WHEN role = 'TECHNICIAN' THEN 1 END) as total_tecnicos,
      COUNT(CASE WHEN role = 'ASSISTANT' THEN 1 END) as total_assistentes,
      COUNT(CASE WHEN role = 'CLIENT' THEN 1 END) as total_clientes
    FROM public.users u
    GROUP BY u.empresa_id;
  ELSE
    RAISE EXCEPTION 'Acesso negado: Requer perfil SUPERADMIN';
  END IF;
END;
$$;
