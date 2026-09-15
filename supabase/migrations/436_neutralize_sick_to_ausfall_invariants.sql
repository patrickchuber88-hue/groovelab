-- ==============================================================================
-- 🏛️ MIGRATION 436: NEUTRALIZE SICK/KRANK TO AUSFALL (DSGVO ART. 9 & ASVS LEVEL 3)
-- Standards: OWASP ASVS Level 3 / DSGVO Art. 9, Art. 25 / AGENTS.md Monolith Goldstandard
-- Scope:
--   1. Add neutral columns ausfall_until & ausfall_start to public.users_raw
--   2. Synchronize existing records (sick_until -> ausfall_until, sick_start -> ausfall_start)
--   3. Extend public.schedules schedules_status_check constraint with neutral tokens:
--      'teacher_ausfall', 'canceled_by_teacher_ausfall'
--   4. Update existing schedules and schedule_occurrences to neutral tokens
--   5. Re-create public.users view with ausfall_until and ausfall_start exposed
--   6. Update trg_users_view_dml to support bidirectional synchronization for ausfall_until and ausfall_start
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ADD NEUTRAL COLUMNS TO users_raw
-- ------------------------------------------------------------------------------
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS ausfall_until TIMESTAMPTZ;
ALTER TABLE public.users_raw ADD COLUMN IF NOT EXISTS ausfall_start TIMESTAMPTZ;

-- ------------------------------------------------------------------------------
-- 2. MIGRATE EXISTING DATA
-- ------------------------------------------------------------------------------
UPDATE public.users_raw 
SET ausfall_until = sick_until 
WHERE ausfall_until IS NULL AND sick_until IS NOT NULL;

UPDATE public.users_raw 
SET ausfall_start = sick_start 
WHERE ausfall_start IS NULL AND sick_start IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 3. UPDATE SCHEDULES STATUS CONSTRAINT
-- ------------------------------------------------------------------------------
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check CHECK (
  status IN (
    'draft', 
    'ready_for_admin_review', 
    'approved', 
    'canceled_by_student', 
    'pending_parent_approval', 
    'pending_reschedule', 
    'teacher_ausfall', 
    'canceled_by_teacher_ausfall',
    'teacher_sick', 
    'canceled_by_teacher_sick'
  )
);

-- ------------------------------------------------------------------------------
-- 4. MIGRATE EXISTING SCHEDULE STATUSES
-- ------------------------------------------------------------------------------
UPDATE public.schedules SET status = 'teacher_ausfall' WHERE status = 'teacher_sick';
UPDATE public.schedules SET status = 'canceled_by_teacher_ausfall' WHERE status = 'canceled_by_teacher_sick';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'schedule_occurrences' 
      AND column_name = 'status' 
      AND udt_name NOT IN ('schedule_status')
  ) THEN
    EXECUTE 'UPDATE public.schedule_occurrences SET status = ''teacher_ausfall'' WHERE status = ''teacher_sick''';
    EXECUTE 'UPDATE public.schedule_occurrences SET status = ''canceled_by_teacher_ausfall'' WHERE status = ''canceled_by_teacher_sick''';
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. RE-CREATE public.users VIEW WITH ausfall_until & ausfall_start
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.users 
WITH (security_barrier = true, security_invoker = true) AS
SELECT ur.id,                                                                                                                                                                                                                                                   
     ur.school_id,                                                                                                                                                                                                                                                
     ur.role,                                                                                                                                                                                                                                                     
     ur.first_name,                                                                                                                                                                                                                                               
     CASE                                                                                                                                                                                                                                                     
         -- 1. Self, master admin, or staff members querying within the school get full last names
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN (ur.last_name)::text
         
         -- 2. Teachers and school administration are ALWAYS displayed with full name (Vorname + Nachname) for students and parents (AGENTS.md Invariante)
         WHEN (ur.role::text = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text]) OR (ur.roles IS NOT NULL AND ('teacher' = ANY(ur.roles) OR 'admin' = ANY(ur.roles) OR 'secretary' = ANY(ur.roles)))) THEN (ur.last_name)::text
         
         -- 3. Minors / students viewed by classmates or anon are anonymized to first initial
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
     ur.sick_start,                                                                                                                                                                                                                                               
     ur.push_notifications_enabled,                                                                                                                                                                                                                               
     ur.push_notif_schedule_changes,                                                                                                                                                                                                                              
     ur.push_notif_homework,                                                                                                                                                                                                                                      
     ur.push_notif_all_features,                                                                                                                                                                                                                                  
     ur.app_usage_mode,                                                                                                                                                                                                                                           
     ur.preferred_room_ids,                                                                                                                                                                                                                                       
     ur.groovelab_instrument,                                                                                                                                                                                                                                     
     CASE                                                                                                                                                                                                                                                     
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))) THEN (ur.student_billing_payment_method)::text
         ELSE NULL::text                                                                                                                                                                                                                                      
     END AS student_billing_payment_method,                                                                                                                                                                                                                   
     ur.activated_at,                                                                                                                                                                                                                                             
     CASE                                                                                                                                                                                                                                                     
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['admin'::text, 'secretary'::text])))) THEN ur.student_billing_cash_paid             
         ELSE NULL::boolean                                                                                                                                                                                                                                   
     END AS student_billing_cash_paid,                                                                                                                                                                                                                        
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
     CASE
         WHEN ((get_current_authenticated_user_id() = ur.id) OR is_master_admin() OR ((get_current_user_school_id() = ur.school_id) AND (get_current_user_role() = ANY (ARRAY['teacher'::text, 'admin'::text, 'secretary'::text])))) THEN
             ( SELECT ((safe_pgp_sym_decrypt(uep.prefix, get_encryption_key()) || '@'::text) || (ues.suffix)::text)
                    FROM (user_email_prefixes uep
                      JOIN user_email_suffixes ues ON ((uep.user_id = ues.user_id)))
                   WHERE (uep.user_id = ur.id)
                  LIMIT 1)
         ELSE NULL::text
     END AS email,
     ur.ausfall_until,
     ur.ausfall_start
FROM users_raw ur;

COMMENT ON VIEW public.users IS 'Tier-1 Enterprise+ security-hardened view of users_raw with unmasked staff names, neutral absence fields, and role-based GDPR PII student masking.';
GRANT SELECT ON public.users TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 6. UPDATE trg_users_view_dml TO HANDLE ausfall_until & ausfall_start
-- ------------------------------------------------------------------------------
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

        DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
        DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
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

    -- Compute unified neutral / legacy absence timestamps
    v_target_ausfall_until := COALESCE(NEW.ausfall_until, NEW.sick_until);
    v_target_ausfall_start := COALESCE(NEW.ausfall_start, NEW.sick_start);

    -- 5. INSERT Operation
    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_master THEN
            NEW.is_master_admin := FALSE;
        END IF;

        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, calendar_token, instrument,
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear,
            musical_styles, equipment_list, last_seen, expertise, age, birth_date,
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu,
            master_admin_username, is_trial, trial_ends_at,
            contract_ends_at, contract_decision_made, delete_after_contract,
            status, is_master_admin, is_app_user, is_campus_active,
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer,
            teacher_qr_token, is_active, max_students, nickname,
            ausweis_id, show_sekretariat, show_campus, show_groovelab,
            lesson_duration, planned_boards, required_equipment, sick_until,
            phone, joker_used, is_pin_activated, "groovelab_räume", "campus_räume",
            joker_used_at, sick_start, push_notifications_enabled, push_notif_schedule_changes,
            push_notif_homework, push_notif_all_features, app_usage_mode,
            preferred_room_ids, groovelab_instrument, student_billing_payment_method,
            activated_at, student_billing_cash_paid, roles, exempt_from_direct_billing,
            group_id, sibling_group_id, parent_allow_chat, parent_allow_timer,
            parent_allow_leaderboard, parent_allow_groups, parent_allow_proposals,
            parent_allow_absences, parent_allow_audio, campus_ui_level, parent_permissions,
            pin_enforced_for_preview, parent_name, parental_consent_given_at, consent_version, campus_usage_mode,
            teacher_onboarding_completed, teacher_availability,
            is_2fa_enabled, parent_pin, personal_pin, failed_pin_attempts, pin_locked_until,
            sessions_revoked_at, token_version, token_signature, qr_token_redeemed_at,
            skill_radar_levels, ausfall_until, ausfall_start
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
            NEW.push_notif_schedule_changes,
            NEW.push_notif_homework,
            NEW.push_notif_all_features,
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
            NEW.parent_name,
            NEW.parental_consent_given_at,
            NEW.consent_version,
            NEW.campus_usage_mode,
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
            NEW.skill_radar_levels,
            v_target_ausfall_until,
            v_target_ausfall_start
        );
        RETURN NEW;

    -- 6. UPDATE Operation
    ELSIF TG_OP = 'UPDATE' THEN
        -- 🛡️ BOLA / IDOR RESTORATION GUARD:
        -- Non-master and non-staff callers CAN ONLY update their own row!
        IF NOT v_is_master AND NOT v_is_school_staff THEN
            IF v_caller_uid IS NULL OR OLD.id <> v_caller_uid THEN
                RAISE EXCEPTION 'UNAUTHORIZED: Sie können nur Ihr eigenes Profil bearbeiten.' USING ERRCODE = '42501';
            END IF;
        END IF;

        -- Staff callers CAN ONLY update rows belonging to their own music school!
        IF NOT v_is_master AND v_is_school_staff THEN
            IF public.get_current_user_school_id() IS NULL OR OLD.school_id IS DISTINCT FROM public.get_current_user_school_id() THEN
                RAISE EXCEPTION 'MANDANTEN_TRENNUNG: Zugriff auf Profile fremder Schulen verweigert.' USING ERRCODE = '42501';
            END IF;
        END IF;

        -- 🛡️ ZERO-TRUST PRIVILEGE-ESCALATION GUARDS:
        IF NOT v_is_master THEN
            NEW.school_id := OLD.school_id;
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.roles := OLD.roles;
            IF NOT v_is_school_staff AND OLD.id = v_caller_uid THEN
                NEW.role := OLD.role;
            END IF;
        END IF;

        UPDATE public.users_raw SET
            school_id = COALESCE(NEW.school_id, users_raw.school_id),
            role = COALESCE(NEW.role, users_raw.role),
            first_name = COALESCE(NEW.first_name, users_raw.first_name),
            last_name = CASE 
                WHEN v_is_student THEN users_raw.last_name 
                ELSE COALESCE(NEW.last_name, users_raw.last_name) 
            END,
            avatar_url = COALESCE(NEW.avatar_url, users_raw.avatar_url),
            qr_token = COALESCE(NEW.qr_token, users_raw.qr_token),
            calendar_token = COALESCE(NEW.calendar_token, users_raw.calendar_token),
            instrument = COALESCE(NEW.instrument, users_raw.instrument),
            coach_notes = COALESCE(NEW.coach_notes, users_raw.coach_notes),
            photo_url = COALESCE(NEW.photo_url, users_raw.photo_url),
            bio = COALESCE(NEW.bio, users_raw.bio),
            bands = COALESCE(NEW.bands, users_raw.bands),
            projects = COALESCE(NEW.projects, users_raw.projects),
            listening = COALESCE(NEW.listening, users_raw.listening),
            gear = COALESCE(NEW.gear, users_raw.gear),
            musical_styles = COALESCE(NEW.musical_styles, users_raw.musical_styles),
            equipment_list = COALESCE(NEW.equipment_list, users_raw.equipment_list),
            last_seen = CASE 
                WHEN users_raw.role = 'teacher' THEN NULL 
                ELSE COALESCE(v_target_last_seen, users_raw.last_seen) 
            END,
            expertise = COALESCE(NEW.expertise, users_raw.expertise),
            age = COALESCE(NEW.age, users_raw.age),
            birth_date = COALESCE(NEW.birth_date, users_raw.birth_date),
            pending_repertoire_proposal = COALESCE(NEW.pending_repertoire_proposal, users_raw.pending_repertoire_proposal),
            is_external_vocalist = COALESCE(NEW.is_external_vocalist, users_raw.is_external_vocalist),
            show_messages_menu = COALESCE(NEW.show_messages_menu, users_raw.show_messages_menu),
            master_admin_username = COALESCE(NEW.master_admin_username, users_raw.master_admin_username),
            is_trial = COALESCE(NEW.is_trial, users_raw.is_trial),
            trial_ends_at = COALESCE(NEW.trial_ends_at, users_raw.trial_ends_at),
            contract_ends_at = COALESCE(NEW.contract_ends_at, users_raw.contract_ends_at),
            contract_decision_made = COALESCE(NEW.contract_decision_made, users_raw.contract_decision_made),
            delete_after_contract = COALESCE(NEW.delete_after_contract, users_raw.delete_after_contract),
            status = CASE 
                WHEN v_is_student THEN users_raw.status 
                ELSE COALESCE(NEW.status, users_raw.status) 
            END,
            is_app_user = COALESCE(NEW.is_app_user, users_raw.is_app_user),
            is_campus_active = CASE 
                WHEN v_is_student THEN users_raw.is_campus_active 
                ELSE COALESCE(NEW.is_campus_active, users_raw.is_campus_active) 
            END,
            is_groovelab_active = CASE 
                WHEN v_is_student THEN users_raw.is_groovelab_active 
                ELSE COALESCE(NEW.is_groovelab_active, users_raw.is_groovelab_active) 
            END,
            is_premium_user = CASE 
                WHEN v_is_student THEN users_raw.is_premium_user 
                ELSE COALESCE(NEW.is_premium_user, users_raw.is_premium_user) 
            END,
            teacher_id = COALESCE(NEW.teacher_id, users_raw.teacher_id),
            ausweis_nummer = COALESCE(NEW.ausweis_nummer, users_raw.ausweis_nummer),
            teacher_qr_token = COALESCE(NEW.teacher_qr_token, users_raw.teacher_qr_token),
            is_active = COALESCE(NEW.is_active, users_raw.is_active),
            max_students = COALESCE(NEW.max_students, users_raw.max_students),
            nickname = COALESCE(NEW.nickname, users_raw.nickname),
            ausweis_id = COALESCE(NEW.ausweis_id, users_raw.ausweis_id),
            show_sekretariat = COALESCE(NEW.show_sekretariat, users_raw.show_sekretariat),
            show_campus = COALESCE(NEW.show_campus, users_raw.show_campus),
            show_groovelab = COALESCE(NEW.show_groovelab, users_raw.show_groovelab),
            lesson_duration = COALESCE(NEW.lesson_duration, users_raw.lesson_duration),
            planned_boards = COALESCE(NEW.planned_boards, users_raw.planned_boards),
            required_equipment = COALESCE(NEW.required_equipment, users_raw.required_equipment),
            sick_until = COALESCE(NEW.ausfall_until, NEW.sick_until, users_raw.sick_until),
            phone = COALESCE(NEW.phone, users_raw.phone),
            joker_used = COALESCE(NEW.joker_used, users_raw.joker_used),
            is_pin_activated = COALESCE(NEW.is_pin_activated, users_raw.is_pin_activated),
            "groovelab_räume" = COALESCE(NEW."groovelab_räume", users_raw."groovelab_räume"),
            "campus_räume" = COALESCE(NEW."campus_räume", users_raw."campus_räume"),
            joker_used_at = COALESCE(NEW.joker_used_at, users_raw.joker_used_at),
            sick_start = COALESCE(NEW.ausfall_start, NEW.sick_start, users_raw.sick_start),
            push_notifications_enabled = COALESCE(NEW.push_notifications_enabled, users_raw.push_notifications_enabled),
            push_notif_schedule_changes = COALESCE(NEW.push_notif_schedule_changes, users_raw.push_notif_schedule_changes),
            push_notif_homework = COALESCE(NEW.push_notif_homework, users_raw.push_notif_homework),
            push_notif_all_features = COALESCE(NEW.push_notif_all_features, users_raw.push_notif_all_features),
            app_usage_mode = COALESCE(NEW.app_usage_mode, users_raw.app_usage_mode),
            preferred_room_ids = COALESCE(NEW.preferred_room_ids, users_raw.preferred_room_ids),
            groovelab_instrument = COALESCE(NEW.groovelab_instrument, users_raw.groovelab_instrument),
            student_billing_payment_method = COALESCE(NEW.student_billing_payment_method, users_raw.student_billing_payment_method),
            activated_at = COALESCE(NEW.activated_at, users_raw.activated_at),
            student_billing_cash_paid = COALESCE(NEW.student_billing_cash_paid, users_raw.student_billing_cash_paid),
            exempt_from_direct_billing = COALESCE(NEW.exempt_from_direct_billing, users_raw.exempt_from_direct_billing),
            group_id = COALESCE(NEW.group_id, users_raw.group_id),
            sibling_group_id = COALESCE(NEW.sibling_group_id, users_raw.sibling_group_id),
            parent_allow_chat = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_chat 
                ELSE COALESCE(NEW.parent_allow_chat, users_raw.parent_allow_chat) 
            END,
            parent_allow_timer = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_timer 
                ELSE COALESCE(NEW.parent_allow_timer, users_raw.parent_allow_timer) 
            END,
            parent_allow_leaderboard = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_leaderboard 
                ELSE COALESCE(NEW.parent_allow_leaderboard, users_raw.parent_allow_leaderboard) 
            END,
            parent_allow_groups = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_groups 
                ELSE COALESCE(NEW.parent_allow_groups, users_raw.parent_allow_groups) 
            END,
            parent_allow_proposals = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_proposals 
                ELSE COALESCE(NEW.parent_allow_proposals, users_raw.parent_allow_proposals) 
            END,
            parent_allow_absences = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_absences 
                ELSE COALESCE(NEW.parent_allow_absences, users_raw.parent_allow_absences) 
            END,
            parent_allow_audio = CASE 
                WHEN v_is_student THEN users_raw.parent_allow_audio 
                ELSE COALESCE(NEW.parent_allow_audio, users_raw.parent_allow_audio) 
            END,
            parent_permissions = CASE 
                WHEN v_is_student THEN users_raw.parent_permissions 
                ELSE COALESCE(NEW.parent_permissions, users_raw.parent_permissions) 
            END,
            parent_pin = CASE 
                WHEN v_is_student THEN users_raw.parent_pin 
                ELSE COALESCE(hashed_parent_pin, users_raw.parent_pin) 
            END,
            campus_ui_level = CASE 
                WHEN v_is_student THEN users_raw.campus_ui_level 
                ELSE COALESCE(NEW.campus_ui_level, users_raw.campus_ui_level) 
            END,
            personal_pin = CASE 
                WHEN v_is_student THEN users_raw.personal_pin 
                ELSE COALESCE(NEW.personal_pin, users_raw.personal_pin) 
            END,
            pin_enforced_for_preview = COALESCE(NEW.pin_enforced_for_preview, users_raw.pin_enforced_for_preview),
            parent_name = COALESCE(NEW.parent_name, users_raw.parent_name),
            parental_consent_given_at = COALESCE(NEW.parental_consent_given_at, users_raw.parental_consent_given_at),
            consent_version = COALESCE(NEW.consent_version, users_raw.consent_version),
            campus_usage_mode = COALESCE(NEW.campus_usage_mode, users_raw.campus_usage_mode),
            teacher_onboarding_completed = COALESCE(NEW.teacher_onboarding_completed, users_raw.teacher_onboarding_completed),
            teacher_availability = COALESCE(NEW.teacher_availability, users_raw.teacher_availability),
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            failed_pin_attempts = COALESCE(NEW.failed_pin_attempts, users_raw.failed_pin_attempts),
            pin_locked_until = COALESCE(NEW.pin_locked_until, users_raw.pin_locked_until),
            sessions_revoked_at = COALESCE(NEW.sessions_revoked_at, users_raw.sessions_revoked_at),
            token_version = COALESCE(NEW.token_version, users_raw.token_version),
            token_signature = COALESCE(NEW.token_signature, users_raw.token_signature),
            qr_token_redeemed_at = COALESCE(NEW.qr_token_redeemed_at, users_raw.qr_token_redeemed_at),
            skill_radar_levels = COALESCE(NEW.skill_radar_levels, users_raw.skill_radar_levels),
            ausfall_until = COALESCE(NEW.ausfall_until, NEW.sick_until, users_raw.ausfall_until),
            ausfall_start = COALESCE(NEW.ausfall_start, NEW.sick_start, users_raw.ausfall_start)
        WHERE id = OLD.id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
    INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_users_view_dml();
