-- RPCs necessárias para o painel do Superadmin
-- Execute este script no SQL Editor do Supabase

-- 1. Retorna todas as empresas (ignora RLS via SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.get_all_empresas_for_superadmin();
CREATE OR REPLACE FUNCTION public.get_all_empresas_for_superadmin()
RETURNS TABLE (
  id uuid,
  nome text,
  email text,
  plano text,
  plano_status text,
  plano_expira_em timestamptz,
  status text,
  criado_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se quem está chamando é SUPERADMIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem chamar esta função.';
  END IF;

  RETURN QUERY
  SELECT
    e.id,
    e.nome,
    e.email,
    e.plano,
    e.plano_status,
    e.plano_expira_em,
    e.status,
    e.criado_em
  FROM public.empresas e
  ORDER BY e.criado_em DESC;
END;
$$;

-- 2. Retorna a contagem de usuários agrupada por empresa (ignora RLS via SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.get_users_count_by_empresa();
CREATE OR REPLACE FUNCTION public.get_users_count_by_empresa()
RETURNS TABLE (
  empresa_id uuid,
  total_tecnicos bigint,
  total_admins bigint,
  total_assistentes bigint,
  total_clientes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem chamar esta função.';
  END IF;

  RETURN QUERY
  SELECT
    u.empresa_id,
    COUNT(*) FILTER (WHERE u.role = 'TECHNICIAN') AS total_tecnicos,
    COUNT(*) FILTER (WHERE u.role = 'ADMIN')       AS total_admins,
    COUNT(*) FILTER (WHERE u.role = 'ASSISTANT')   AS total_assistentes,
    COUNT(*) FILTER (WHERE u.role = 'CLIENT')      AS total_clientes
  FROM public.users u
  GROUP BY u.empresa_id;
END;
$$;

-- 3. Atualiza o plano/status de uma empresa (ignora RLS via SECURITY DEFINER)
DROP FUNCTION IF EXISTS public.update_empresa_plan(uuid, text, text, timestamptz);
CREATE OR REPLACE FUNCTION public.update_empresa_plan(
  p_empresa_id uuid,
  p_novo_plano text,
  p_novo_status text,
  p_expira_em timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_superadmin() THEN
    RAISE EXCEPTION 'Acesso negado: apenas superadmins podem chamar esta função.';
  END IF;

  UPDATE public.empresas
  SET
    plano        = p_novo_plano,
    plano_status = p_novo_status,
    plano_expira_em = p_expira_em
  WHERE id = p_empresa_id;
END;
$$;

-- Concede permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_all_empresas_for_superadmin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_count_by_empresa() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_empresa_plan(uuid, text, text, timestamptz) TO authenticated;

-- Recarrega o schema
NOTIFY pgrst, 'reload schema';
