-- Migration 187: Fix users_select RLS policy to allow onboarding first user
-- By allowing SELECT on users_raw if the school has no other users (or only the single new admin user),
-- we prevent RLS failures when anonymous registration inserts a new user and requests the inserted row back.

DROP POLICY IF EXISTS users_select ON public.users_raw;

CREATE POLICY users_select ON public.users_raw
FOR SELECT
USING (
    (is_master_admin = true)
    OR is_master_admin()
    OR (
        (get_kiosk_token() IS NOT NULL)
        AND (
            EXISTS (
                SELECT 1
                FROM kiosks k
                WHERE ((k.secret_token = get_kiosk_token()) AND (k.school_id = users_raw.school_id))
            )
        )
    )
    OR (
        (get_kiosk_token() IS NULL)
        AND (get_qr_token() IS NOT NULL)
        AND (
            ((qr_token)::text = get_qr_token())
            OR ((teacher_qr_token)::text = get_qr_token())
            OR (upper((ausweis_nummer)::text) = upper(get_qr_token()))
        )
    )
    OR check_school_access(school_id)
    OR school_has_no_users(school_id)
);

NOTIFY pgrst, 'reload schema';
