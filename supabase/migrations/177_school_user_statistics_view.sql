-- 📊 GrooveLab School User Statistics View
-- Erstellt eine View für aggregierte Benutzerstatistiken pro Schule, um die 1000er API-Grenze (PostgREST Limit) im Master-Dashboard zu umgehen.

CREATE OR REPLACE VIEW public.school_user_statistics WITH (security_invoker = true) AS
SELECT 
    school_id,
    COUNT(CASE WHEN role IN ('teacher', 'admin') THEN 1 END)::int AS teachers,
    COUNT(CASE WHEN role = 'student' THEN 1 END)::int AS students,
    COUNT(CASE WHEN role IN ('teacher', 'admin') AND is_campus_active THEN 1 END)::int AS teachers_campus,
    COUNT(CASE WHEN role IN ('teacher', 'admin') AND is_groovelab_active THEN 1 END)::int AS teachers_groovelab,
    COUNT(CASE WHEN role = 'student' AND is_campus_active THEN 1 END)::int AS students_campus,
    COUNT(CASE WHEN role = 'student' AND is_groovelab_active THEN 1 END)::int AS students_groovelab
FROM public.users_raw
GROUP BY school_id;

-- Berechtigungen erteilen
GRANT SELECT ON public.school_user_statistics TO authenticated;
GRANT SELECT ON public.school_user_statistics TO anon;
