-- Corrige o erro de "Database error querying schema" causado por inlining da função SQL

-- 1. Substituir a função por uma versão PL/pgSQL que não sofra "inlining" do Postgres
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  SELECT empresa_id INTO v_empresa_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
  RETURN v_empresa_id;
END;
$$;
