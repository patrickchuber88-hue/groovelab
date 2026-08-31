-- ==============================================================================
-- Migration 322: Tier-1 SaaS Enterprise+ Comprehensive RLS Suite
-- Implements robust, school-isolated CRUD Row-Level Security policies for all tables
-- ==============================================================================

-- 1. SESSIONS
DROP POLICY IF EXISTS "sessions_select_policy" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_policy" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_policy" ON public.sessions;
DROP POLICY IF EXISTS "sessions_delete_policy" ON public.sessions;

CREATE POLICY "sessions_select_policy" ON public.sessions
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = sessions.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

CREATE POLICY "sessions_insert_policy" ON public.sessions
FOR INSERT TO authenticated, anon
WITH CHECK (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = sessions.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
    OR (public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
);

CREATE POLICY "sessions_update_policy" ON public.sessions
FOR UPDATE TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = sessions.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
    OR (public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
)
WITH CHECK (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = sessions.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
    OR (public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
);

CREATE POLICY "sessions_delete_policy" ON public.sessions
FOR DELETE TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
);

-- 2. AVATARS
DROP POLICY IF EXISTS "avatars_select_policy" ON public.avatars;
DROP POLICY IF EXISTS "avatars_insert_policy" ON public.avatars;
DROP POLICY IF EXISTS "avatars_update_policy" ON public.avatars;
DROP POLICY IF EXISTS "avatars_delete_policy" ON public.avatars;

CREATE POLICY "avatars_select_policy" ON public.avatars
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = avatars.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

CREATE POLICY "avatars_insert_policy" ON public.avatars
FOR INSERT TO authenticated, anon
WITH CHECK (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = avatars.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

CREATE POLICY "avatars_update_policy" ON public.avatars
FOR UPDATE TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = avatars.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

CREATE POLICY "avatars_delete_policy" ON public.avatars
FOR DELETE TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (user_id = public.get_current_authenticated_user_id())
);

-- 3. ROOM BOOKINGS & BLOCKED SLOTS
DROP POLICY IF EXISTS "room_bookings_select_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_insert_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_update_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_delete_policy" ON public.room_bookings;

CREATE POLICY "room_bookings_select_policy" ON public.room_bookings
FOR SELECT TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

CREATE POLICY "room_bookings_insert_policy" ON public.room_bookings
FOR INSERT TO authenticated, anon
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

CREATE POLICY "room_bookings_update_policy" ON public.room_bookings
FOR UPDATE TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

CREATE POLICY "room_bookings_delete_policy" ON public.room_bookings
FOR DELETE TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- 4. ROOM BLOCKED SLOTS
DROP POLICY IF EXISTS "room_blocked_slots_all_policy" ON public.room_blocked_slots;
CREATE POLICY "room_blocked_slots_all_policy" ON public.room_blocked_slots
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- 5. PROGRESS MATRIX
DROP POLICY IF EXISTS "progress_matrix_all_policy" ON public.progress_matrix;
CREATE POLICY "progress_matrix_all_policy" ON public.progress_matrix
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR teacher_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = progress_matrix.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR teacher_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = progress_matrix.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

-- 6. LESSONS
DROP POLICY IF EXISTS "lessons_all_policy" ON public.lessons;
CREATE POLICY "lessons_all_policy" ON public.lessons
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- 7. INSTRUMENTS & SUBJECTS
DROP POLICY IF EXISTS "instruments_select_policy" ON public.instruments;
DROP POLICY IF EXISTS "instruments_manage_policy" ON public.instruments;
CREATE POLICY "instruments_select_policy" ON public.instruments FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "instruments_manage_policy" ON public.instruments FOR ALL TO authenticated, anon 
USING (public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'secretary'))
WITH CHECK (public.is_master_admin() OR public.get_current_user_role() IN ('admin', 'secretary'));

DROP POLICY IF EXISTS "subjects_all_policy" ON public.subjects;
CREATE POLICY "subjects_all_policy" ON public.subjects
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- 8. BUILDINGS & SCHOOL EQUIPMENT
DROP POLICY IF EXISTS "buildings_all_policy" ON public.buildings;
CREATE POLICY "buildings_all_policy" ON public.buildings
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "school_equipment_all_policy" ON public.school_equipment;
CREATE POLICY "school_equipment_all_policy" ON public.school_equipment
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- 9. SCHEDULE EXCEPTIONS & PREFERENCES
DROP POLICY IF EXISTS "schedule_exceptions_all_policy" ON public.schedule_exceptions;
CREATE POLICY "schedule_exceptions_all_policy" ON public.schedule_exceptions
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.schedules s 
        WHERE s.id = schedule_exceptions.schedule_id 
        AND s.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.schedules s 
        WHERE s.id = schedule_exceptions.schedule_id 
        AND s.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "student_schedule_preferences_all_policy" ON public.student_schedule_preferences;
CREATE POLICY "student_schedule_preferences_all_policy" ON public.student_schedule_preferences
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_schedule_preferences.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_schedule_preferences.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

-- 10. SHEET MUSIC ANNOTATIONS & CAMPUS ANNOUNCEMENTS
DROP POLICY IF EXISTS "sheet_music_annotations_all_policy" ON public.sheet_music_annotations;
CREATE POLICY "sheet_music_annotations_all_policy" ON public.sheet_music_annotations
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = sheet_music_annotations.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = sheet_music_annotations.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "campus_announcements_all_policy" ON public.campus_announcements;
CREATE POLICY "campus_announcements_all_policy" ON public.campus_announcements
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')));

-- 11. DUTIES, LAB PLANNING, BAND GIGS & MEDIA
DROP POLICY IF EXISTS "duties_all_policy" ON public.duties;
CREATE POLICY "duties_all_policy" ON public.duties
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "lab_planning_all_policy" ON public.lab_planning;
CREATE POLICY "lab_planning_all_policy" ON public.lab_planning
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "band_gigs_all_policy" ON public.band_gigs;
CREATE POLICY "band_gigs_all_policy" ON public.band_gigs
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_gigs.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_gigs.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "band_media_all_policy" ON public.band_media;
CREATE POLICY "band_media_all_policy" ON public.band_media
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_media.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_media.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "band_shoutbox_all_policy" ON public.band_shoutbox;
CREATE POLICY "band_shoutbox_all_policy" ON public.band_shoutbox
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_shoutbox.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_shoutbox.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "band_song_proposals_all_policy" ON public.band_song_proposals;
CREATE POLICY "band_song_proposals_all_policy" ON public.band_song_proposals
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_song_proposals.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.bands b 
        WHERE b.id = band_song_proposals.band_id 
        AND b.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "band_proposal_votes_all_policy" ON public.band_proposal_votes;
CREATE POLICY "band_proposal_votes_all_policy" ON public.band_proposal_votes
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.band_song_proposals p 
        JOIN public.bands b ON p.band_id = b.id 
        WHERE p.id = band_proposal_votes.proposal_id 
        AND b.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.band_song_proposals p 
        JOIN public.bands b ON p.band_id = b.id 
        WHERE p.id = band_proposal_votes.proposal_id 
        AND b.school_id = public.get_current_user_school_id()
    )
);

-- 12. CAMPUS EVENTS & PROGRAM POINTS
DROP POLICY IF EXISTS "campus_event_program_points_all_policy" ON public.campus_event_program_points;
CREATE POLICY "campus_event_program_points_all_policy" ON public.campus_event_program_points
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

-- 13. FEED POSTS & INTERACTIONS
DROP POLICY IF EXISTS "class_feed_posts_all_policy" ON public.class_feed_posts;
CREATE POLICY "class_feed_posts_all_policy" ON public.class_feed_posts
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE (u.id = class_feed_posts.student_id OR u.id = class_feed_posts.teacher_id) 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE (u.id = class_feed_posts.student_id OR u.id = class_feed_posts.teacher_id) 
        AND u.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "feed_interactions_all_policy" ON public.feed_interactions;
CREATE POLICY "feed_interactions_all_policy" ON public.feed_interactions
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = feed_interactions.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = feed_interactions.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

-- 14. HELP & RESCHEDULE REQUESTS
DROP POLICY IF EXISTS "help_requests_all_policy" ON public.help_requests;
CREATE POLICY "help_requests_all_policy" ON public.help_requests
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "reschedule_requests_all_policy" ON public.reschedule_requests;
CREATE POLICY "reschedule_requests_all_policy" ON public.reschedule_requests
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.schedule_occurrences o 
        JOIN public.users_raw u ON (o.student_id = u.id OR o.teacher_id = u.id) 
        WHERE o.id = reschedule_requests.occurrence_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR EXISTS (
        SELECT 1 FROM public.schedule_occurrences o 
        JOIN public.users_raw u ON (o.student_id = u.id OR o.teacher_id = u.id) 
        WHERE o.id = reschedule_requests.occurrence_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "rejection_history_all_policy" ON public.rejection_history;
CREATE POLICY "rejection_history_all_policy" ON public.rejection_history
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR teacher_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = rejection_history.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR teacher_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = rejection_history.user_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

-- 15. INVOICES, COOPERATIONS, ENSEMBLES
DROP POLICY IF EXISTS "invoices_all_policy" ON public.invoices;
CREATE POLICY "invoices_all_policy" ON public.invoices
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "cooperations_all_policy" ON public.cooperations;
CREATE POLICY "cooperations_all_policy" ON public.cooperations
FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id())
WITH CHECK (public.is_master_admin() OR school_id = public.get_current_user_school_id());

DROP POLICY IF EXISTS "ensemble_members_all_policy" ON public.ensemble_members;
CREATE POLICY "ensemble_members_all_policy" ON public.ensemble_members
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.ensembles e 
        WHERE e.id = ensemble_members.ensemble_id 
        AND e.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.ensembles e 
        WHERE e.id = ensemble_members.ensemble_id 
        AND e.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "ensemble_messages_all_policy" ON public.ensemble_messages;
CREATE POLICY "ensemble_messages_all_policy" ON public.ensemble_messages
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.ensembles e 
        WHERE e.id = ensemble_messages.ensemble_id 
        AND e.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR user_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.ensembles e 
        WHERE e.id = ensemble_messages.ensemble_id 
        AND e.school_id = public.get_current_user_school_id()
    )
);

-- 16. STUDENT FIRST & LAST NAMES
DROP POLICY IF EXISTS "student_first_names_all_policy" ON public.student_first_names;
CREATE POLICY "student_first_names_all_policy" ON public.student_first_names
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_first_names.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_first_names.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "student_last_names_all_policy" ON public.student_last_names;
CREATE POLICY "student_last_names_all_policy" ON public.student_last_names
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_last_names.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id() 
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_last_names.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

-- 17. ACTIVATION DAYS & AUDIT TEMP RESULTS
DROP POLICY IF EXISTS "activation_days_all_policy" ON public.activation_days;
CREATE POLICY "activation_days_all_policy" ON public.activation_days
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = activation_days.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = activation_days.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);

DROP POLICY IF EXISTS "audit_temp_results_all_policy" ON public.audit_temp_results;
CREATE POLICY "audit_temp_results_all_policy" ON public.audit_temp_results
FOR ALL TO authenticated, anon
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());
