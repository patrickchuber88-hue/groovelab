-- Revoke execution privileges from public roles to secure functions
REVOKE EXECUTE ON FUNCTION public.exec_sql(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_sql(text) FROM public, anon, authenticated;
