-- ==============================================================================
-- Migration 520: Remedy Zombie Switches & ArbZG Quiet Hours Forensic Hardening
-- Standards: OWASP ASVS Level 3 / ArbZG § 5 / DSGVO Art. 8 & 32 / Hiscox CyberSafe
-- ==============================================================================

-- 1. ADD MISSING COLUMNS TO users_raw (IDEMPOTENT)
ALTER TABLE public.users_raw 
    ADD COLUMN IF NOT EXISTS quiet_hours JSONB NOT NULL DEFAULT '{"enabled": false, "start_time": "19:00", "end_time": "07:30", "weekend_quiet": true}'::jsonb;

ALTER TABLE public.users_raw 
    ADD COLUMN IF NOT EXISTS push_notif_chat BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.users_raw 
    ADD COLUMN IF NOT EXISTS push_notif_practice_reminder BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.users_raw 
    ADD COLUMN IF NOT EXISTS push_notif_weekly_digest BOOLEAN NOT NULL DEFAULT true;

-- Ensure schools and schools_raw have mfa_enforced_for_admins
ALTER TABLE IF EXISTS public.schools 
    ADD COLUMN IF NOT EXISTS mfa_enforced_for_admins BOOLEAN DEFAULT FALSE;

ALTER TABLE IF EXISTS public.schools_raw 
    ADD COLUMN IF NOT EXISTS mfa_enforced_for_admins BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.users_raw.quiet_hours IS 'ArbZG § 5 compliant rest period settings for teachers to protect from off-hour messages.';
COMMENT ON COLUMN public.users_raw.push_notif_chat IS 'Parental/user opt-in preference for chat push notifications.';
COMMENT ON COLUMN public.users_raw.push_notif_practice_reminder IS 'Parental/user opt-in preference for daily practice streak protection reminders.';
COMMENT ON COLUMN public.users_raw.push_notif_weekly_digest IS 'Parental/user opt-in preference for Sunday weekly practice digest.';

-- 2. RE-CREATE PUBLIC.USERS VIEW WITH QUIET_HOURS AND GRANULAR PUSH PREFERENCES
CREATE OR REPLACE VIEW public.users 
WITH (security_barrier = true, security_invoker = true) AS
SELECT ur.id,                                                                                                                                                                                                                                                   
     ur.school_id,                                                                                                                                                                                                                                                
     ur.role,                                                                                                                                                                                                                                                     
     ur.first_name,                                                                                                                                                                                                                                               
     CASE                                                                                                                                                                                                                                                     
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN (ur.last_name)::text
         ELSE COALESCE((SUBSTRING(ur.last_name FROM 1 FOR 1) || '.'::text), ''::text)                                                                                                                                                                         
     END AS last_name,                                                                                                                                                                                                                                        
     ur.avatar_url,                                                                                                                                                                                                                                               
     CASE                                                                                                                                                                                                                                                     
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN ur.qr_token         
         ELSE NULL::uuid                                                                                                                                                                                                                                      
     END AS qr_token,                                                                                                                                                                                                                                         
     CASE                                                                                                                                                                                                                                                     
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN ur.calendar_token   
         ELSE NULL::text                                                                                                                                                                                                                                      
     END AS calendar_token,                                                                                                                                                                                                                                   
     ur.instrument,                                                                                                                                                                                                                                               
     ur.created_at,                                                                                                                                                                                                                                               
     ur.coach_notes,                                                                                                                                                                                                                                              
     ur.photo_url,                                                                                                                                                                                                                                                
     ur.bio,                                                                                                                                                                                                                                                      
     ur.bands,                                                                                                                                                                                                                                                    
     ur.projects,                                                                                                                                                                                                                                                 
     ur.listening,                                                                                                                                                                                                                                                
     ur.gear,                                                                                                                                                                                                                                                     
     ur.musical_styles,                                                                                                                                                                                                                                           
     ur.equipment_list,                                                                                                                                                                                                                                           
     ur.last_seen,                                                                                                                                                                                                                                                
     ur.expertise,                                                                                                                                                                                                                                                
     ur.age,                                                                                                                                                                                                                                                      
     ur.birth_date,                                                                                                                                                                                                                                               
     ur.pending_repertoire_proposal,                                                                                                                                                                                                                              
     ur.is_external_vocalist,                                                                                                                                                                                                                                     
     ur.show_messages_menu,                                                                                                                                                                                                                                       
     ur.master_admin_username,                                                                                                                                                                                                                                    
     NULL::text AS master_admin_password,                                                                                                                                                                                                                         
     ur.is_trial,                                                                                                                                                                                                                                                 
     ur.trial_ends_at,                                                                                                                                                                                                                                            
     ur.contract_ends_at,                                                                                                                                                                                                                                         
     ur.contract_decision_made,                                                                                                                                                                                                                                   
     ur.delete_after_contract,                                                                                                                                                                                                                                    
     ur.status,                                                                                                                                                                                                                                                   
     ur.is_master_admin,                                                                                                                                                                                                                                          
     ur.is_app_user,                                                                                                                                                                                                                                              
     ur.is_campus_active,                                                                                                                                                                                                                                         
     ur.is_groovelab_active,                                                                                                                                                                                                                                      
     ur.is_premium_user,                                                                                                                                                                                                                                          
     ur.teacher_id,                                                                                                                                                                                                                                               
     (                                                                                                                                                                                                                                                            
         CASE                                                                                                                                                                                                                                                     
             WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN ur.ausweis_nummer   
             ELSE NULL::character varying                                                                                                                                                                                                                         
         END)::character varying(255) AS ausweis_nummer,                                                                                                                                                                                                          
     (                                                                                                                                                                                                                                                            
         CASE                                                                                                                                                                                                                                                     
             WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))) THEN ur.teacher_qr_token                  
             ELSE NULL::character varying                                                                                                                                                                                                                         
         END)::character varying(255) AS teacher_qr_token,                                                                                                                                                                                                        
     ur.is_active,                                                                                                                                                                                                                                                
     ur.max_students,                                                                                                                                                                                                                                             
     ur.nickname,                                                                                                                                                                                                                                                 
     NULL::text AS password_hash,                                                                                                                                                                                                                                 
     ur.ausweis_id,                                                                                                                                                                                                                                               
     ur.show_sekretariat,                                                                                                                                                                                                                                         
     ur.show_campus,                                                                                                                                                                                                                                              
     ur.show_groovelab,                                                                                                                                                                                                                                           
     ur.lesson_duration,                                                                                                                                                                                                                                          
     ur.planned_boards,                                                                                                                                                                                                                                           
     ur.required_equipment,                                                                                                                                                                                                                                       
     ur.sick_until,                                                                                                                                                                                                                                               
     CASE
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN (ur.phone)::text
         ELSE NULL::text
     END AS phone,                                                                                                                                                                                                                                                
     ur.joker_used,                                                                                                                                                                                                                                               
     ur.is_pin_activated,                                                                                                                                                                                                                                         
     ur."groovelab_räume",                                                                                                                                                                                                                                        
     ur."campus_räume",                                                                                                                                                                                                                                           
     ur.joker_used_at,                                                                                                                                                                                                                                            
     ur.ausfall_until,                                                                                                                                                                                                                                            
     ur.push_notifications_enabled,                                                                                                                                                                                                                               
     ur.push_notif_schedule_changes,                                                                                                                                                                                                                              
     ur.push_notif_homework,                                                                                                                                                                                                                                      
     ur.push_notif_all_features,                                                                                                                                                                                                                                  
     ur.push_notif_chat,                                                                                                                                                                                                                                          
     ur.push_notif_practice_reminder,                                                                                                                                                                                                                             
     ur.push_notif_weekly_digest,                                                                                                                                                                                                                                 
     ur.quiet_hours,                                                                                                                                                                                                                                              
     ur.app_usage_mode,                                                                                                                                                                                                                                           
     ur.preferred_room_ids,                                                                                                                                                                                                                                       
     ur.groovelab_instrument,                                                                                                                                                                                                                                     
     ur.student_billing_payment_method,                                                                                                                                                                                                                           
     ur.activated_at,                                                                                                                                                                                                                                             
     ur.student_billing_cash_paid,                                                                                                                                                                                                                                
     ur.roles,                                                                                                                                                                                                                                                    
     ur.exempt_from_direct_billing,                                                                                                                                                                                                                               
     ur.group_id,                                                                                                                                                                                                                                                 
     ur.sibling_group_id,                                                                                                                                                                                                                                         
     ur.parent_allow_chat,                                                                                                                                                                                                                                        
     ur.parent_allow_timer,                                                                                                                                                                                                                                       
     ur.parent_allow_leaderboard,                                                                                                                                                                                                                                 
     ur.parent_allow_groups,                                                                                                                                                                                                                                      
     ur.parent_allow_proposals,                                                                                                                                                                                                                                   
     ur.parent_allow_absences,                                                                                                                                                                                                                                    
     ur.parent_allow_audio,                                                                                                                                                                                                                                       
     ur.campus_ui_level,                                                                                                                                                                                                                                          
     ur.parent_permissions,                                                                                                                                                                                                                                       
     ur.pin_enforced_for_preview,                                                                                                                                                                                                                                 
     ur.teacher_onboarding_completed,                                                                                                                                                                                                                             
     ur.teacher_availability,                                                                                                                                                                                                                                     
     ur.is_2fa_enabled,                                                                                                                                                                                                                                           
     NULL::text AS two_factor_secret,                                                                                                                                                                                                                             
     NULL::text AS parent_pin,                                                                                                                                                                                                                                    
     NULL::text AS personal_pin,                                                                                                                                                                                                                                  
     user_has_parent_pin(ur.id) AS has_parent_pin,                                                                                                                                                                                                                
     user_has_personal_pin(ur.id) AS has_personal_pin,                                                                                                                                                                                                            
     ur.failed_pin_attempts,                                                                                                                                                                                                                                      
     ur.pin_locked_until,                                                                                                                                                                                                                                         
     ur.sessions_revoked_at,                                                                                                                                                                                                                                      
     ur.token_version,                                                                                                                                                                                                                                            
     ur.token_signature,                                                                                                                                                                                                                                          
     ur.qr_token_redeemed_at,                                                                                                                                                                                                                                     
     NULL::text AS email
FROM users_raw ur;

COMMENT ON VIEW public.users IS 'Tier-1 Enterprise+ security-hardened view of users_raw with ArbZG quiet_hours and granular push preferences.';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated, service_role;

-- 3. UPDATE trg_users_view_dml TO PERSIST quiet_hours AND PUSH PREFERENCES
CREATE OR REPLACE FUNCTION public.trg_users_view_dml()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_uid UUID;
    v_is_master BOOLEAN;
    v_caller_role TEXT;
    v_is_student BOOLEAN;
    v_is_school_staff BOOLEAN;
    hashed_parent_pin TEXT := NULL;
    v_target_last_seen TIMESTAMPTZ;
    v_target_ausfall_until TIMESTAMPTZ;
    v_target_ausfall_start TIMESTAMPTZ;
BEGIN
    -- 1. DELETE Operation
    IF TG_OP = 'DELETE' THEN
        v_caller_uid := public.get_current_authenticated_user_id();
        v_is_master := public.is_master_admin();
        v_caller_role := public.get_current_user_role();

        IF NOT v_is_master AND NOT (v_caller_role IN ('admin', 'secretary') AND public.get_current_user_school_id() = OLD.school_id) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zum Löschen von Benutzerkonten.' USING ERRCODE = '42501';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'private_auth') THEN
            DELETE FROM private_auth.user_secrets WHERE user_id = OLD.id;
        END IF;
        DELETE FROM public.session_leases WHERE user_id = OLD.id;
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;

    -- 2. Identify Caller Authority
    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_master := public.is_master_admin();
    v_caller_role := public.get_current_user_role();
    v_is_student := (v_caller_role = 'student');
    v_is_school_staff := (v_caller_role IN ('admin', 'secretary'));

    -- 3. Parent PIN Hashing
    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    -- 4. Teacher Non-Surveillance Guard
    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

    v_target_ausfall_until := NEW.ausfall_until;
    v_target_ausfall_start := NEW.ausfall_start;

    -- 5. INSERT Operation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url,
            qr_token, calendar_token, instrument, created_at, coach_notes,
            photo_url, bio, bands, projects, listening, gear, musical_styles,
            equipment_list, last_seen, expertise, age, birth_date,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at, contract_ends_at,
            contract_decision_made, delete_after_contract, status,
            is_master_admin, is_app_user, is_campus_active, is_groovelab_active,
            is_premium_user, teacher_id, ausweis_nummer, teacher_qr_token,
            is_active, max_students, nickname, ausweis_id, show_sekretariat,
            show_campus, show_groovelab, lesson_duration, planned_boards,
            required_equipment, sick_until, phone, joker_used, is_pin_activated,
            "groovelab_räume", "campus_räume", joker_used_at, ausfall_start,
            push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features,
            push_notif_chat, push_notif_practice_reminder, push_notif_weekly_digest,
            quiet_hours,
            app_usage_mode, preferred_room_ids, groovelab_instrument,
            student_billing_payment_method, activated_at, student_billing_cash_paid,
            roles, exempt_from_direct_billing, group_id, sibling_group_id,
            parent_allow_chat, parent_allow_timer, parent_allow_leaderboard,
            parent_allow_groups, parent_allow_proposals, parent_allow_absences,
            parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, teacher_onboarding_completed,
            teacher_availability, is_2fa_enabled, parent_pin, personal_pin,
            failed_pin_attempts, pin_locked_until, sessions_revoked_at,
            token_version, token_signature, qr_token_redeemed_at,
            ausfall_until
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.school_id,
            COALESCE(NEW.role, 'student'),
            NEW.first_name,
            NEW.last_name,
            NEW.avatar_url,
            NEW.qr_token,
            NEW.calendar_token,
            NEW.instrument,
            COALESCE(NEW.created_at, NOW()),
            NEW.coach_notes,
            NEW.photo_url,
            NEW.bio,
            NEW.bands,
            NEW.projects,
            NEW.listening,
            NEW.gear,
            NEW.musical_styles,
            NEW.equipment_list,
            v_target_last_seen,
            NEW.expertise,
            NEW.age,
            NEW.birth_date,
            NEW.pending_repertoire_proposal,
            NEW.is_external_vocalist,
            NEW.show_messages_menu,
            NEW.master_admin_username,
            COALESCE(NEW.is_trial, FALSE),
            NEW.trial_ends_at,
            NEW.contract_ends_at,
            COALESCE(NEW.contract_decision_made, FALSE),
            COALESCE(NEW.delete_after_contract, FALSE),
            COALESCE(NEW.status, 'active'),
            COALESCE(NEW.is_master_admin, FALSE),
            COALESCE(NEW.is_app_user, FALSE),
            COALESCE(NEW.is_campus_active, FALSE),
            COALESCE(NEW.is_groovelab_active, FALSE),
            COALESCE(NEW.is_premium_user, FALSE),
            NEW.teacher_id,
            NEW.ausweis_nummer,
            NEW.teacher_qr_token,
            COALESCE(NEW.is_active, TRUE),
            NEW.max_students,
            NEW.nickname,
            NEW.ausweis_id,
            NEW.show_sekretariat,
            NEW.show_campus,
            NEW.show_groovelab,
            NEW.lesson_duration,
            NEW.planned_boards,
            NEW.required_equipment,
            v_target_ausfall_until,
            NEW.phone,
            NEW.joker_used,
            COALESCE(NEW.is_pin_activated, FALSE),
            NEW."groovelab_räume",
            NEW."campus_räume",
            NEW.joker_used_at,
            v_target_ausfall_start,
            NEW.push_notifications_enabled,
            COALESCE(NEW.push_notif_schedule_changes, TRUE),
            COALESCE(NEW.push_notif_homework, TRUE),
            COALESCE(NEW.push_notif_all_features, TRUE),
            COALESCE(NEW.push_notif_chat, TRUE),
            COALESCE(NEW.push_notif_practice_reminder, TRUE),
            COALESCE(NEW.push_notif_weekly_digest, TRUE),
            COALESCE(NEW.quiet_hours, '{"enabled": false, "start_time": "19:00", "end_time": "07:30", "weekend_quiet": true}'::jsonb),
            NEW.app_usage_mode,
            NEW.preferred_room_ids,
            NEW.groovelab_instrument,
            NEW.student_billing_payment_method,
            NEW.activated_at,
            NEW.student_billing_cash_paid,
            NEW.roles,
            NEW.exempt_from_direct_billing,
            NEW.group_id,
            NEW.sibling_group_id,
            NEW.parent_allow_chat,
            NEW.parent_allow_timer,
            NEW.parent_allow_leaderboard,
            NEW.parent_allow_groups,
            NEW.parent_allow_proposals,
            NEW.parent_allow_absences,
            COALESCE(NEW.parent_allow_audio, FALSE),
            COALESCE(NEW.campus_ui_level, 'junior'),
            NEW.parent_permissions,
            NEW.pin_enforced_for_preview,
            NEW.teacher_onboarding_completed,
            NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, FALSE),
            hashed_parent_pin,
            NEW.personal_pin,
            COALESCE(NEW.failed_pin_attempts, 0),
            NEW.pin_locked_until,
            NEW.sessions_revoked_at,
            NEW.token_version,
            NEW.token_signature,
            NEW.qr_token_redeemed_at,
            v_target_ausfall_until
        );
        RETURN NEW;

    -- 6. UPDATE Operation
    ELSIF TG_OP = 'UPDATE' THEN
        IF NOT v_is_master AND NOT v_is_school_staff THEN
            IF v_caller_uid IS NULL OR OLD.id <> v_caller_uid THEN
                RAISE EXCEPTION 'UNAUTHORIZED: Sie können nur Ihr eigenes Profil bearbeiten.' USING ERRCODE = '42501';
            END IF;
        END IF;

        IF NOT v_is_master AND v_is_school_staff THEN
            IF public.get_current_user_school_id() IS NULL OR OLD.school_id IS DISTINCT FROM public.get_current_user_school_id() THEN
                RAISE EXCEPTION 'MANDANTEN_TRENNUNG: Zugriff auf Profile fremder Schulen verweigert.' USING ERRCODE = '42501';
            END IF;
        END IF;

        IF NOT v_is_master THEN
            NEW.school_id := OLD.school_id;
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.master_admin_username := OLD.master_admin_username;
        END IF;

        IF v_is_student THEN
            NEW.role := OLD.role;
            NEW.roles := OLD.roles;
            NEW.is_active := OLD.is_active;
            NEW.is_campus_active := OLD.is_campus_active;
            NEW.is_groovelab_active := OLD.is_groovelab_active;
            NEW.teacher_id := OLD.teacher_id;
            NEW.exempt_from_direct_billing := OLD.exempt_from_direct_billing;
            NEW.parent_allow_chat := OLD.parent_allow_chat;
            NEW.parent_allow_timer := OLD.parent_allow_timer;
            NEW.parent_allow_leaderboard := OLD.parent_allow_leaderboard;
            NEW.parent_allow_groups := OLD.parent_allow_groups;
            NEW.parent_allow_proposals := OLD.parent_allow_proposals;
            NEW.parent_allow_absences := OLD.parent_allow_absences;
            NEW.parent_allow_audio := OLD.parent_allow_audio;
            NEW.campus_ui_level := OLD.campus_ui_level;
            NEW.parent_permissions := OLD.parent_permissions;
        END IF;

        UPDATE public.users_raw SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            calendar_token = NEW.calendar_token,
            instrument = NEW.instrument,
            coach_notes = NEW.coach_notes,
            photo_url = NEW.photo_url,
            bio = NEW.bio,
            bands = NEW.bands,
            projects = NEW.projects,
            listening = NEW.listening,
            gear = NEW.gear,
            musical_styles = NEW.musical_styles,
            equipment_list = NEW.equipment_list,
            last_seen = v_target_last_seen,
            expertise = NEW.expertise,
            age = NEW.age,
            birth_date = NEW.birth_date,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            master_admin_username = NEW.master_admin_username,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
            contract_decision_made = NEW.contract_decision_made,
            delete_after_contract = NEW.delete_after_contract,
            status = NEW.status,
            is_master_admin = NEW.is_master_admin,
            is_app_user = NEW.is_app_user,
            is_campus_active = NEW.is_campus_active,
            is_groovelab_active = NEW.is_groovelab_active,
            is_premium_user = NEW.is_premium_user,
            teacher_id = NEW.teacher_id,
            ausweis_nummer = NEW.ausweis_nummer,
            teacher_qr_token = NEW.teacher_qr_token,
            is_active = NEW.is_active,
            max_students = NEW.max_students,
            nickname = NEW.nickname,
            ausweis_id = NEW.ausweis_id,
            show_sekretariat = NEW.show_sekretariat,
            show_campus = NEW.show_campus,
            show_groovelab = NEW.show_groovelab,
            lesson_duration = NEW.lesson_duration,
            planned_boards = NEW.planned_boards,
            required_equipment = NEW.required_equipment,
            sick_until = v_target_ausfall_until,
            phone = NEW.phone,
            joker_used = NEW.joker_used,
            is_pin_activated = NEW.is_pin_activated,
            "groovelab_räume" = NEW."groovelab_räume",
            "campus_räume" = NEW."campus_räume",
            joker_used_at = NEW.joker_used_at,
            ausfall_until = v_target_ausfall_until,
            ausfall_start = v_target_ausfall_start,
            push_notifications_enabled = NEW.push_notifications_enabled,
            push_notif_schedule_changes = NEW.push_notif_schedule_changes,
            push_notif_homework = NEW.push_notif_homework,
            push_notif_all_features = NEW.push_notif_all_features,
            push_notif_chat = COALESCE(NEW.push_notif_chat, users_raw.push_notif_chat),
            push_notif_practice_reminder = COALESCE(NEW.push_notif_practice_reminder, users_raw.push_notif_practice_reminder),
            push_notif_weekly_digest = COALESCE(NEW.push_notif_weekly_digest, users_raw.push_notif_weekly_digest),
            quiet_hours = COALESCE(NEW.quiet_hours, users_raw.quiet_hours),
            app_usage_mode = NEW.app_usage_mode,
            preferred_room_ids = NEW.preferred_room_ids,
            groovelab_instrument = NEW.groovelab_instrument,
            student_billing_payment_method = NEW.student_billing_payment_method,
            activated_at = NEW.activated_at,
            student_billing_cash_paid = NEW.student_billing_cash_paid,
            roles = NEW.roles,
            exempt_from_direct_billing = NEW.exempt_from_direct_billing,
            group_id = NEW.group_id,
            sibling_group_id = NEW.sibling_group_id,
            parent_allow_chat = NEW.parent_allow_chat,
            parent_allow_timer = NEW.parent_allow_timer,
            parent_allow_leaderboard = NEW.parent_allow_leaderboard,
            parent_allow_groups = NEW.parent_allow_groups,
            parent_allow_proposals = NEW.parent_allow_proposals,
            parent_allow_absences = NEW.parent_allow_absences,
            parent_allow_audio = NEW.parent_allow_audio,
            campus_ui_level = NEW.campus_ui_level,
            parent_permissions = NEW.parent_permissions,
            pin_enforced_for_preview = NEW.pin_enforced_for_preview,
            teacher_onboarding_completed = NEW.teacher_onboarding_completed,
            teacher_availability = NEW.teacher_availability,
            is_2fa_enabled = NEW.is_2fa_enabled,
            parent_pin = COALESCE(hashed_parent_pin, OLD.parent_pin),
            personal_pin = NEW.personal_pin,
            failed_pin_attempts = NEW.failed_pin_attempts,
            pin_locked_until = NEW.pin_locked_until,
            sessions_revoked_at = NEW.sessions_revoked_at,
            token_version = NEW.token_version,
            token_signature = NEW.token_signature,
            qr_token_redeemed_at = NEW.qr_token_redeemed_at
        WHERE id = OLD.id;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- 4. HARDEN AUTHENTICATE_BY_CREDENTIAL (PARITY & HISCOX 2FA / QUIET HOURS)
CREATE OR REPLACE FUNCTION public.authenticate_by_credential(
    p_credential text, 
    p_school_id uuid DEFAULT NULL::uuid, 
    p_device_key text DEFAULT NULL::text, 
    p_device_name text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private_auth', 'pg_temp', 'extensions'
AS $function$
DECLARE
    v_clean text := TRIM(p_credential);
    v_clean_upper text := UPPER(TRIM(p_credential));
    v_user record;
    v_school record;
    v_lease_id uuid;
    v_is_uuid boolean;
    v_sanitized_user jsonb;
    v_headers text;
    v_ip text;
    v_ip_hash text;
    v_ip_failures int := 0;
    v_pin_locked_until timestamptz;
    v_is_admin_pin boolean := FALSE;
    v_token_log_hash text;
    v_has_personal_pin boolean := FALSE;
    v_has_parent_pin boolean := FALSE;
    v_is_pin_activated boolean := FALSE;
    v_day_of_birth int := NULL;
    v_mfa_enforced boolean := FALSE;
BEGIN
    IF v_clean IS NULL OR v_clean = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ungültige Anmeldedaten.');
    END IF;

    -- Compute one-way SHA-256 hash for logging to satisfy CWE-532 (no raw secret leakage in DB)
    BEGIN
        v_token_log_hash := encode(extensions.digest(v_clean, 'sha256'), 'hex');
    EXCEPTION WHEN OTHERS THEN
        v_token_log_hash := 'ANONYMIZED_CREDENTIAL';
    END;

    -- 🛡️ Anti-Spoofing: Extract client IP securely and hash it (GDPR Privacy by Design)
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers <> '' THEN
            v_ip := v_headers::json->>'cf-connecting-ip';
            IF v_ip IS NULL OR v_ip = '' THEN
                v_ip := v_headers::json->>'x-forwarded-for';
            END IF;
            IF v_ip IS NOT NULL AND v_ip <> '' THEN
                v_ip := TRIM(split_part(v_ip, ',', 1));
                v_ip_hash := encode(extensions.digest(v_ip, 'sha256'), 'hex');
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip_hash := NULL;
    END;

    -- 🛡️ Dimension 1: Network IP Rate Limiting (Max 30 failed attempts per IP per 15 minutes)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        SELECT COUNT(*) INTO v_ip_failures
        FROM public.qr_login_rate_limits
        WHERE ip_hash = v_ip_hash
          AND success = FALSE
          AND attempt_at > (NOW() - INTERVAL '15 minutes');

        IF v_ip_failures >= 30 THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Sicherheitssperre: Zu viele fehlerhafte Anmeldeversuche aus diesem Netzwerk. Bitte warten Sie 15 Minuten.'
            );
        END IF;
    END IF;

    -- 🛡️ Dimension 2: Target-Based Rate Limiting (Schul-Sperre gegen verteilte Botnetze)
    IF p_school_id IS NOT NULL AND LENGTH(v_clean) = 4 AND v_clean ~ '^[0-9]+$' THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'private_auth' AND table_name = 'school_secrets') THEN
            SELECT pin_locked_until INTO v_pin_locked_until
            FROM private_auth.school_secrets
            WHERE school_id = p_school_id;

            IF v_pin_locked_until IS NOT NULL AND v_pin_locked_until > NOW() THEN
                RETURN jsonb_build_object(
                    'success', false, 
                    'error', 'Sicherheitssperre: Zu viele fehlerhafte PIN-Versuche für diese Schule. Bitte warten Sie 15 Minuten.'
                );
            END IF;
        END IF;
    END IF;

    -- Check for UUID pattern
    v_is_uuid := (v_clean ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

    -- Credential lookup: qr_token, teacher_qr_token, ausweis_nummer, OR direct user id
    IF v_is_uuid THEN
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (qr_token::text = v_clean OR teacher_qr_token = v_clean OR id::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    ELSE
        SELECT * INTO v_user
        FROM public.users_raw
        WHERE (teacher_qr_token = v_clean 
               OR ausweis_nummer = v_clean 
               OR ausweis_nummer = v_clean_upper
               OR qr_token::text = v_clean)
          AND is_active = TRUE
          AND (p_school_id IS NULL OR school_id = p_school_id OR is_master_admin = TRUE)
        LIMIT 1;
    END IF;

    -- 🛡️ SECURE ADMIN PIN LOOKUP: Salted Tenancy Hash + Plaintext Auto-Migration
    IF v_user IS NULL AND p_school_id IS NOT NULL AND LENGTH(v_clean) = 4 AND v_clean ~ '^[0-9]+$' THEN
        SELECT u.* INTO v_user
        FROM public.users_raw u
        JOIN private_auth.school_secrets sec ON sec.school_id = u.school_id
        WHERE u.school_id = p_school_id
          AND u.role IN ('admin', 'secretary')
          AND u.is_active = TRUE
          AND (
              sec.admin_pin_hash = encode(extensions.digest(v_clean || u.school_id::text, 'sha256'), 'hex')
              OR sec.admin_pin_hash = encode(extensions.digest(v_clean, 'sha256'), 'hex')
              OR sec.admin_pin = v_clean
          )
        ORDER BY CASE WHEN u.role = 'admin' THEN 1 ELSE 2 END
        LIMIT 1;

        IF v_user IS NOT NULL THEN
            v_is_admin_pin := TRUE;
            BEGIN
                UPDATE private_auth.school_secrets
                SET 
                    admin_pin = NULL,
                    admin_pin_hash = encode(extensions.digest(v_clean || p_school_id::text, 'sha256'), 'hex'),
                    failed_pin_attempts = 0,
                    pin_locked_until = NULL,
                    updated_at = NOW()
                WHERE school_id = p_school_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        ELSE
            BEGIN
                UPDATE private_auth.school_secrets
                SET 
                    failed_pin_attempts = COALESCE(failed_pin_attempts, 0) + 1,
                    pin_locked_until = CASE 
                        WHEN COALESCE(failed_pin_attempts, 0) + 1 >= 15 THEN NOW() + INTERVAL '15 minutes' 
                        ELSE NULL 
                    END,
                    updated_at = NOW()
                WHERE school_id = p_school_id;
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;
    END IF;

    -- User not found or inactive
    IF v_user IS NULL THEN
        IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
            INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
            VALUES (v_ip_hash, v_token_log_hash, p_school_id, FALSE);
        END IF;

        RETURN jsonb_build_object(
            'success', false, 
            'error', 'Ungültiger Ausweis-PIN oder QR-Token.'
        );
    END IF;

    -- Fetch school information
    SELECT * INTO v_school
    FROM public.schools
    WHERE id = v_user.school_id;

    v_mfa_enforced := COALESCE(v_school.mfa_enforced_for_admins, FALSE) AND v_user.role IN ('admin', 'secretary');

    -- Create / register session lease
    IF to_regclass('public.session_leases') IS NOT NULL THEN
        INSERT INTO public.session_leases (
            user_id,
            school_id,
            device_name,
            device_key,
            role,
            last_active_at,
            created_at
        ) VALUES (
            v_user.id,
            v_user.school_id,
            COALESCE(p_device_name, 'Browser / Client'),
            COALESCE(p_device_key, gen_random_uuid()::text),
            v_user.role,
            NOW(),
            NOW()
        )
        RETURNING id INTO v_lease_id;
    END IF;

    -- Record success in rate limit table (CWE-532 compliant Hash)
    IF v_ip_hash IS NOT NULL AND to_regclass('public.qr_login_rate_limits') IS NOT NULL THEN
        INSERT INTO public.qr_login_rate_limits (ip_hash, attempted_token, school_id, success)
        VALUES (v_ip_hash, v_token_log_hash, p_school_id, TRUE);
    END IF;

    -- 🛡️ Pre-calculate authoritative security flags (OWASP ASVS Level 3 Zero Secret Leakage)
    v_has_personal_pin := (
        v_user.personal_pin IS NOT NULL 
        OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec 
            WHERE sec.user_id = v_user.id 
              AND sec.argon2_personal_pin_hash IS NOT NULL
        )
    );

    v_has_parent_pin := (
        v_user.parent_pin IS NOT NULL 
        OR EXISTS (
            SELECT 1 FROM private_auth.user_secrets sec 
            WHERE sec.user_id = v_user.id 
              AND sec.argon2_parent_pin_hash IS NOT NULL
        )
    );

    v_is_pin_activated := (
        COALESCE(v_user.is_pin_activated, FALSE) = TRUE 
        OR v_has_personal_pin = TRUE
    );

    -- Fetch activation day_of_birth if exists
    IF to_regclass('public.activation_days') IS NOT NULL THEN
        SELECT act.day_of_birth INTO v_day_of_birth 
        FROM public.activation_days act 
        WHERE act.student_id = v_user.id 
        LIMIT 1;
    END IF;

    -- Build zero-secret sanitized user
    v_sanitized_user := jsonb_build_object(
        'id', v_user.id,
        'first_name', v_user.first_name,
        'last_name', CASE WHEN v_user.role = 'student' THEN NULL ELSE v_user.last_name END,
        'name', CASE WHEN v_user.role = 'student' THEN v_user.first_name ELSE TRIM(CONCAT(v_user.first_name, ' ', v_user.last_name)) END,
        'role', v_user.role,
        'roles', v_user.roles,
        'school_id', v_user.school_id,
        'instrument', v_user.instrument,
        'avatar_url', v_user.avatar_url,
        'photo_url', v_user.photo_url,
        'is_active', v_user.is_active,
        'is_campus_active', v_user.is_campus_active,
        'is_groovelab_active', v_user.is_groovelab_active,
        'is_master_admin', v_user.is_master_admin,
        'has_parent_pin', v_has_parent_pin,
        'has_personal_pin', v_has_personal_pin,
        'is_pin_activated', v_is_pin_activated,
        'is_2fa_enabled', COALESCE(v_user.is_2fa_enabled, FALSE),
        'mfa_enforced_for_admins', v_mfa_enforced,
        'quiet_hours', v_user.quiet_hours,
        'push_notif_schedule_changes', COALESCE(v_user.push_notif_schedule_changes, TRUE),
        'push_notif_homework', COALESCE(v_user.push_notif_homework, TRUE),
        'push_notif_all_features', COALESCE(v_user.push_notif_all_features, TRUE),
        'push_notif_chat', COALESCE(v_user.push_notif_chat, TRUE),
        'push_notif_practice_reminder', COALESCE(v_user.push_notif_practice_reminder, TRUE),
        'push_notif_weekly_digest', COALESCE(v_user.push_notif_weekly_digest, TRUE),
        'ausweis_nummer', v_user.ausweis_nummer,
        'qr_token', v_user.qr_token,
        'teacher_qr_token', v_user.teacher_qr_token,
        'day_of_birth', v_day_of_birth,
        'campus_ui_level', COALESCE(v_user.campus_ui_level, 'junior'),
        'pin_enforced_for_preview', v_user.pin_enforced_for_preview,
        'auth_method', CASE WHEN v_is_admin_pin THEN 'school_admin_pin' ELSE 'credential' END,
        'schools', CASE WHEN v_school.id IS NOT NULL THEN to_jsonb(v_school) ELSE NULL END
    );

    RETURN jsonb_build_object(
        'success', true,
        'lease_token', v_lease_id,
        'user', v_sanitized_user
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.authenticate_by_credential(text, uuid, text, text) TO anon, authenticated, service_role;
