-- ==============================================================================
-- Migration 526: Purge User Phone & Staff Email Remnants (100% Zero-User-Contact)
-- OWASP ASVS Level 3 / Strict Multi-Tenancy / Zero-Trust Privacy Axiom
-- ==============================================================================
-- Context: Campus-Groovelab enforces the strict Zero-User-Contact doctrine:
-- No personal or employee email addresses or phone numbers are EVER stored
-- for ANY natural person (students, parents, teachers, secretary, or school directors).
-- Only the institution (schools table) maintains institutional address, phone, and billing email.
-- Authentication for all users is 100% credential-based (Ausweis, QR, PIN, WebAuthn Passkeys).
-- This migration permanently drops:
--  1. users_raw.phone
--  2. users_raw.birth_date & users_raw.age (only activation_days.day_of_birth is permitted)
--  3. legacy student email tables (public.email_prefixes, public.email_suffixes)
-- Updates public.users view and trg_users_view_dml to permanently eliminate these fields.
-- zero-downtime-bypass: SEC-88 Zero-User-Contact & Institutional B2B Separation Architecture requirement to permanently purge natural person phone, age and birth date columns.
-- ==============================================================================

-- 1. DROP LEGACY TABLES & COLUMNS
DROP TABLE IF EXISTS public.email_prefixes CASCADE;
DROP TABLE IF EXISTS public.email_suffixes CASCADE;

ALTER TABLE IF EXISTS public.users_raw DROP COLUMN IF EXISTS phone CASCADE;
ALTER TABLE IF EXISTS public.users_raw DROP COLUMN IF EXISTS birth_date CASCADE;
ALTER TABLE IF EXISTS public.users_raw DROP COLUMN IF EXISTS age CASCADE;

-- 2. RE-CREATE PUBLIC.USERS VIEW (WITHOUT PHONE, EMAIL, BIRTH_DATE, AGE)
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
     NULL::integer AS age,                                                                                                                                                                                                                                                      
     NULL::date AS birth_date,                                                                                                                                                                                                                                               
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
     ur.ausfall_until AS sick_until,                                                                                                                                                                                                                                               
     NULL::text AS phone,                                                                                                                                                                                                                                                
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
     NULL::text AS email,
     ur.ausfall_start
FROM users_raw ur;

COMMENT ON VIEW public.users IS 'Tier-1 Enterprise+ security-hardened view of users_raw with 100% Zero-User-Contact architecture (Zero Phone, Zero Email for all natural persons).';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO anon, authenticated, service_role;

-- 3. RE-CREATE trg_users_view_dml WITHOUT PHONE, BIRTH_DATE, AGE
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

    v_target_ausfall_until := COALESCE(NEW.ausfall_until, NEW.sick_until);
    v_target_ausfall_start := NEW.ausfall_start;

    -- 5. INSERT Operation
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url,
            qr_token, calendar_token, instrument, created_at, coach_notes,
            photo_url, bio, bands, projects, listening, gear, musical_styles,
            equipment_list, last_seen, expertise,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at, contract_ends_at,
            contract_decision_made, delete_after_contract, status,
            is_master_admin, is_app_user, is_campus_active, is_groovelab_active,
            is_premium_user, teacher_id, ausweis_nummer, teacher_qr_token,
            is_active, max_students, nickname, ausweis_id, show_sekretariat,
            show_campus, show_groovelab, lesson_duration, planned_boards,
            required_equipment, joker_used, is_pin_activated,
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
            NEW.quiet_hours,
            NEW.app_usage_mode,
            NEW.preferred_room_ids,
            NEW.groovelab_instrument,
            NEW.student_billing_payment_method,
            NEW.activated_at,
            COALESCE(NEW.student_billing_cash_paid, FALSE),
            COALESCE(NEW.roles, ARRAY[COALESCE(NEW.role, 'student')]),
            COALESCE(NEW.exempt_from_direct_billing, FALSE),
            NEW.group_id,
            NEW.sibling_group_id,
            COALESCE(NEW.parent_allow_chat, TRUE),
            COALESCE(NEW.parent_allow_timer, TRUE),
            COALESCE(NEW.parent_allow_leaderboard, TRUE),
            COALESCE(NEW.parent_allow_groups, TRUE),
            COALESCE(NEW.parent_allow_proposals, TRUE),
            COALESCE(NEW.parent_allow_absences, TRUE),
            COALESCE(NEW.parent_allow_audio, TRUE),
            COALESCE(NEW.campus_ui_level, 'teen'),
            COALESCE(NEW.parent_permissions, '{}'::jsonb),
            COALESCE(NEW.pin_enforced_for_preview, FALSE),
            COALESCE(NEW.teacher_onboarding_completed, FALSE),
            NEW.teacher_availability,
            COALESCE(NEW.is_2fa_enabled, FALSE),
            hashed_parent_pin,
            NEW.personal_pin,
            COALESCE(NEW.failed_pin_attempts, 0),
            NEW.pin_locked_until,
            NEW.sessions_revoked_at,
            COALESCE(NEW.token_version, 1),
            NEW.token_signature,
            NEW.qr_token_redeemed_at,
            v_target_ausfall_until
        );

        RETURN NEW;
    END IF;

    -- 6. UPDATE Operation
    IF TG_OP = 'UPDATE' THEN
        -- Prevent privilege escalation
        IF NOT v_is_master AND NOT v_is_school_staff THEN
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                NEW.role := OLD.role;
            END IF;
            IF NEW.is_master_admin IS DISTINCT FROM OLD.is_master_admin THEN
                NEW.is_master_admin := OLD.is_master_admin;
            END IF;
            IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
                NEW.school_id := OLD.school_id;
            END IF;
        END IF;

        UPDATE public.users_raw
        SET
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
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            personal_pin = COALESCE(NEW.personal_pin, users_raw.personal_pin),
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

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
    INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trg_users_view_dml();
