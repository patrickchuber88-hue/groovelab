-- Migration: 235_allow_anonymous_campus_direct_messages_rls
-- Description: Allow anonymous student/parent users with a valid QR token to read and insert direct messages for their occurrences

DROP POLICY IF EXISTS campus_direct_messages_all ON public.campus_direct_messages;

CREATE POLICY campus_direct_messages_all ON public.campus_direct_messages FOR ALL USING (
    public.is_master_admin() OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE (u.id = sender_id OR u.id = recipient_id) 
        AND (
            public.check_school_access(u.school_id)
            OR u.qr_token::text = public.get_qr_token() 
            OR u.teacher_qr_token = public.get_qr_token()
        )
    )
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
