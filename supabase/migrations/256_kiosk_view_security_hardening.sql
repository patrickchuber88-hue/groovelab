-- Migration 256: Minimalist Kiosk Student Check-In Security View
-- Restricts Kiosk iPads to a minimal, read-only view containing only non-sensitive check-in data.
-- Enforces strict multi-tenancy school isolation via get_kiosk_token().

CREATE OR REPLACE VIEW public.kiosk_student_checkin_view 
WITH (security_barrier = true) AS
SELECT 
  u.id,
  u.school_id,
  u.first_name,
  u.avatar_url,
  u.qr_token,
  u.ausweis_nummer
FROM public.users_raw u
WHERE u.role = 'student'
  AND (
    public.is_master_admin()
    OR (
      public.get_kiosk_token() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.kiosks k
        WHERE k.secret_token = public.get_kiosk_token()
          AND k.school_id = u.school_id
      )
    )
    OR (
      public.get_qr_token() IS NOT NULL
      AND (
        u.qr_token::text = public.get_qr_token()
        OR upper(u.ausweis_nummer::text) = upper(public.get_qr_token())
        OR u.id::text = public.get_qr_token()
      )
    )
  );

COMMENT ON VIEW public.kiosk_student_checkin_view IS 'Minimalist read-only view for Kiosk iPads providing DSGVO data minimization for student check-ins.';

GRANT SELECT ON public.kiosk_student_checkin_view TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
