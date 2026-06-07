CREATE OR REPLACE FUNCTION public.get_active_subjects(target_school_id UUID DEFAULT NULL)
RETURNS TABLE (name TEXT) AS $$
BEGIN
    IF target_school_id IS NULL THEN
        RETURN QUERY 
        SELECT DISTINCT s.name 
        FROM public.subjects s 
        WHERE s.is_active = true 
        ORDER BY s.name ASC;
    ELSE
        RETURN QUERY 
        SELECT s.name 
        FROM public.subjects s 
        WHERE s.school_id = target_school_id 
          AND s.is_active = true 
        ORDER BY s.name ASC;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET row_security = off;

GRANT EXECUTE ON FUNCTION public.get_active_subjects(UUID) TO anon, authenticated, service_role;
