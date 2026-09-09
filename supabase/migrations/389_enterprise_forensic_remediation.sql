-- ==============================================================================
-- Migration 389: Definitive Forensic Security Remediation & Multi-Tenancy Seal
-- Standard: OWASP ASVS Level 3 / DSGVO Art. 5, 8, 25 & 32 / BSI IT-Grundschutz
-- Remediates: Findings 1 through 10 of the Enterprise Forensic Security Audit
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REMEDIATE FINDING 1: DROP LEFTOVER SESSION_LEASES INSERT POLICY (CVSS 10.0)
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.session_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.session_leases FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_leases_insert" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_insert_scoped" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_insert_policy" ON public.session_leases;
DROP POLICY IF EXISTS "session_leases_deny_client_insert" ON public.session_leases;

-- Direct client-side inserts are strictly blocked.
-- Session leases can ONLY be created by authoritative RPCs (login_master_admin, authenticate_by_credential)
CREATE POLICY "session_leases_deny_client_insert" ON public.session_leases
FOR INSERT TO authenticated, anon
WITH CHECK (
    public.is_master_admin()
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
);

-- ------------------------------------------------------------------------------
-- 2. REMEDIATE FINDING 2: SECURE KIOSK_STUDENT_CHECKIN_VIEW (ZERO CREDENTIAL LEAK)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.kiosk_student_checkin_view CASCADE;

CREATE OR REPLACE VIEW public.kiosk_student_checkin_view 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
  u.id,
  u.school_id,
  u.first_name,
  u.avatar_url
  -- qr_token and ausweis_nummer are EXCLUDED to prevent credential harvesting
FROM public.users_raw u
WHERE u.role = 'student'
  AND (
    public.is_master_admin()
    OR (
      public.get_kiosk_token() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.kiosks k
        WHERE k.secret_token::text = public.get_kiosk_token()
          AND k.school_id = u.school_id
      )
    )
    OR (
      public.get_qr_token() IS NOT NULL
      AND (
        u.qr_token::text = public.get_qr_token()
        OR upper(u.ausweis_nummer::text) = upper(public.get_qr_token())
      )
    )
  );

COMMENT ON VIEW public.kiosk_student_checkin_view IS 'Minimalist read-only view for Kiosk iPads providing DSGVO data minimization for student check-ins.';
GRANT SELECT ON public.kiosk_student_checkin_view TO anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. REMEDIATE FINDING 3: SECURE PENDING_STUDENTS_DECRYPTED VIEW
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.pending_students_decrypted CASCADE;

CREATE OR REPLACE VIEW public.pending_students_decrypted 
WITH (security_barrier = true, security_invoker = true) AS
SELECT 
    s.id,
    s.school_id,
    s.teacher_id,
    s.instrument,
    s.status,
    s.created_at,
    s.lesson_duration,
    s.group_id,
    COALESCE(
        public.safe_pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()),
        'Schüler'
    ) AS first_name,
    sln.last_name,
    ad.day_of_birth
FROM public.students s
LEFT JOIN public.student_first_names sfn ON s.id = sfn.student_id
LEFT JOIN public.student_last_names sln ON s.id = sln.student_id
LEFT JOIN public.activation_days ad ON s.id = ad.student_id
WHERE s.status::text = 'ausstehend'::text
  AND (
      public.is_master_admin() 
      OR (
          public.get_current_user_school_id() IS NOT NULL 
          AND s.school_id = public.get_current_user_school_id()
          AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
      )
  );

REVOKE ALL ON public.pending_students_decrypted FROM anon;
GRANT SELECT ON public.pending_students_decrypted TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. REMEDIATE FINDING 4: GDPR PII MASKING IN PUBLIC.USERS VIEW
-- ------------------------------------------------------------------------------
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
      END AS email
    FROM users_raw ur;

COMMENT ON VIEW public.users IS 'Tier-1 Enterprise+ security-hardened view of users_raw with role-based GDPR PII masking.';
GRANT SELECT ON public.users TO anon, authenticated, service_role;

-- Ensure canonical DML trigger function on public.users is active
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_caller_uid UUID;
    v_caller_role TEXT;
    v_is_master BOOLEAN := FALSE;
    v_is_student BOOLEAN := FALSE;
    v_is_school_staff BOOLEAN := FALSE;
    hashed_parent_pin TEXT := NULL;
    v_target_last_seen TIMESTAMPTZ;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_is_master := public.is_master_admin();
        v_caller_role := public.get_current_user_role();
        IF NOT v_is_master AND v_caller_role NOT IN ('admin', 'secretary') THEN
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

    v_caller_uid := public.get_current_authenticated_user_id();
    v_is_master := public.is_master_admin();
    v_caller_role := public.get_current_user_role();
    v_is_student := (v_caller_role = 'student');
    v_is_school_staff := (v_caller_role IN ('admin', 'secretary'));

    IF NEW.parent_pin IS NOT NULL AND NEW.parent_pin <> '' THEN
        IF length(NEW.parent_pin) = 64 THEN
            hashed_parent_pin := NEW.parent_pin;
        ELSE
            hashed_parent_pin := encode(digest(NEW.parent_pin, 'sha256'), 'hex');
        END IF;
    END IF;

    IF NEW.role = 'teacher' THEN
        v_target_last_seen := NULL;
    ELSE
        v_target_last_seen := NEW.last_seen;
    END IF;

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
            skill_radar_levels
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()),
            NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.calendar_token, NEW.instrument,
            COALESCE(NEW.created_at, NOW()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, v_target_last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu,
            NEW.master_admin_username, COALESCE(NEW.is_trial, FALSE), NEW.trial_ends_at,
            NEW.contract_ends_at, NEW.contract_decision_made, NEW.delete_after_contract,
            NEW.status, COALESCE(NEW.is_master_admin, FALSE), COALESCE(NEW.is_app_user, TRUE), COALESCE(NEW.is_campus_active, FALSE),
            COALESCE(NEW.is_groovelab_active, FALSE), COALESCE(NEW.is_premium_user, FALSE), NEW.teacher_id, NEW.ausweis_nummer,
            NEW.teacher_qr_token, COALESCE(NEW.is_active, TRUE), NEW.max_students, NEW.nickname,
            NEW.ausweis_id, NEW.show_sekretariat, NEW.show_campus, NEW.show_groovelab,
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until,
            NEW.phone, NEW.joker_used, COALESCE(NEW.is_pin_activated, FALSE), NEW."groovelab_räume", NEW."campus_räume",
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
            skill_radar_levels
        );
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- BOLA Guard
        IF NOT v_is_school_staff AND NOT v_is_master AND (v_caller_uid IS NULL OR OLD.id <> v_caller_uid) THEN
            RAISE EXCEPTION 'Zugriff verweigert: Unzureichende Berechtigungen zur Bearbeitung fremder Benutzerdatensätze.' USING ERRCODE = '42501';
        END IF;

        -- Privilege Escalation Guard & PIN Lockout Shield
        IF NOT v_is_master THEN
            NEW.is_master_admin := OLD.is_master_admin;
            NEW.school_id := OLD.school_id;
        END IF;

        -- STRICT LOCKOUT SHIELD: Non-staff CANNOT reset their own lockout or attempts!
        IF NOT v_is_school_staff AND NOT v_is_master THEN
            NEW.role := OLD.role;
            NEW.roles := OLD.roles;
            NEW.pin_locked_until := OLD.pin_locked_until;
            NEW.failed_pin_attempts := OLD.failed_pin_attempts;
            NEW.is_pin_activated := OLD.is_pin_activated;
        END IF;

        IF v_is_student THEN
            NEW.last_name := OLD.last_name;
            NEW.parent_allow_chat := OLD.parent_allow_chat;
            NEW.parent_allow_timer := OLD.parent_allow_timer;
            NEW.parent_allow_leaderboard := OLD.parent_allow_leaderboard;
            NEW.parent_allow_groups := OLD.parent_allow_groups;
            NEW.parent_allow_proposals := OLD.parent_allow_proposals;
            NEW.parent_allow_absences := OLD.parent_allow_absences;
            NEW.parent_allow_audio := OLD.parent_allow_audio;
            NEW.parent_permissions := OLD.parent_permissions;
            NEW.parent_name := OLD.parent_name;
            NEW.parental_consent_given_at := OLD.parental_consent_given_at;
            NEW.consent_version := OLD.consent_version;
            NEW.campus_usage_mode := OLD.campus_usage_mode;
            NEW.student_billing_cash_paid := OLD.student_billing_cash_paid;
            NEW.exempt_from_direct_billing := OLD.exempt_from_direct_billing;
            NEW.student_billing_payment_method := OLD.student_billing_payment_method;
            NEW.activated_at := OLD.activated_at;
            hashed_parent_pin := NULL;
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
            sick_until = NEW.sick_until,
            phone = NEW.phone,
            joker_used = NEW.joker_used,
            is_pin_activated = NEW.is_pin_activated,
            "groovelab_räume" = NEW."groovelab_räume",
            "campus_räume" = NEW."campus_räume",
            joker_used_at = NEW.joker_used_at,
            sick_start = NEW.sick_start,
            push_notifications_enabled = NEW.push_notifications_enabled,
            push_notif_schedule_changes = NEW.push_notif_schedule_changes,
            push_notif_homework = NEW.push_notif_homework,
            push_notif_all_features = NEW.push_notif_all_features,
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
            parent_name = NEW.parent_name,
            parental_consent_given_at = NEW.parental_consent_given_at,
            consent_version = NEW.consent_version,
            campus_usage_mode = NEW.campus_usage_mode,
            teacher_onboarding_completed = NEW.teacher_onboarding_completed,
            teacher_availability = NEW.teacher_availability,
            is_2fa_enabled = COALESCE(NEW.is_2fa_enabled, users_raw.is_2fa_enabled),
            parent_pin = COALESCE(hashed_parent_pin, users_raw.parent_pin),
            failed_pin_attempts = NEW.failed_pin_attempts,
            pin_locked_until = NEW.pin_locked_until,
            sessions_revoked_at = NEW.sessions_revoked_at,
            token_version = NEW.token_version,
            token_signature = NEW.token_signature,
            qr_token_redeemed_at = NEW.qr_token_redeemed_at,
            skill_radar_levels = NEW.skill_radar_levels
        WHERE id = OLD.id;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- Ensure DML trigger on public.users is active
DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

-- ------------------------------------------------------------------------------
-- 5. REMEDIATE FINDING 5: REMOVE BOLA / IDOR IN INTERNAL DATA TABLES
-- ------------------------------------------------------------------------------
-- A. LESSONS
ALTER TABLE IF EXISTS public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lessons FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
DROP POLICY IF EXISTS "lessons_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_delete" ON public.lessons;
DROP POLICY IF EXISTS "lessons_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_all_policy" ON public.lessons;
DROP POLICY IF EXISTS "lessons_select_scoped" ON public.lessons;
DROP POLICY IF EXISTS "lessons_modify_scoped" ON public.lessons;

CREATE POLICY "lessons_select_scoped" ON public.lessons
FOR SELECT TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

CREATE POLICY "lessons_modify_scoped" ON public.lessons
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (
        school_id = public.get_current_user_school_id() 
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_authenticated_user_id())
        )
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR (
        school_id = public.get_current_user_school_id() 
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_authenticated_user_id())
        )
    )
);

-- B. ROOM BOOKINGS
ALTER TABLE IF EXISTS public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.room_bookings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_bookings_select" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_insert" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_update" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_delete" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_fallback_all" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_all" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_select_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_insert_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_update_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_delete_policy" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_select_scoped" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_insert_scoped" ON public.room_bookings;
DROP POLICY IF EXISTS "room_bookings_update_delete_scoped" ON public.room_bookings;

CREATE POLICY "room_bookings_select_scoped" ON public.room_bookings
FOR SELECT TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());

CREATE POLICY "room_bookings_insert_scoped" ON public.room_bookings
FOR INSERT TO authenticated, anon
WITH CHECK (
    public.is_master_admin() 
    OR (
        school_id = public.get_current_user_school_id() 
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
    )
);

CREATE POLICY "room_bookings_update_delete_scoped" ON public.room_bookings
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR (
        school_id = public.get_current_user_school_id() 
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR booked_by = public.get_current_authenticated_user_id()
        )
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR (
        school_id = public.get_current_user_school_id() 
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR booked_by = public.get_current_authenticated_user_id()
        )
    )
);

-- C. PROGRESS MATRIX
ALTER TABLE IF EXISTS public.progress_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.progress_matrix FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_matrix_all" ON public.progress_matrix;
DROP POLICY IF EXISTS "progress_matrix_all_policy" ON public.progress_matrix;
DROP POLICY IF EXISTS "progress_matrix_select_scoped" ON public.progress_matrix;
DROP POLICY IF EXISTS "progress_matrix_modify_scoped" ON public.progress_matrix;

CREATE POLICY "progress_matrix_select_scoped" ON public.progress_matrix
FOR SELECT TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR teacher_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_school_id() IS NOT NULL
        AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        AND EXISTS (
            SELECT 1 FROM public.users_raw u 
            WHERE u.id = progress_matrix.student_id 
              AND u.school_id = public.get_current_user_school_id()
        )
    )
);

CREATE POLICY "progress_matrix_modify_scoped" ON public.progress_matrix
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_school_id() IS NOT NULL
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_authenticated_user_id())
        )
        AND EXISTS (
            SELECT 1 FROM public.users_raw u 
            WHERE u.id = progress_matrix.student_id 
              AND u.school_id = public.get_current_user_school_id()
        )
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR (
        public.get_current_user_school_id() IS NOT NULL
        AND (
            public.get_current_user_role() IN ('admin', 'secretary')
            OR (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_authenticated_user_id())
        )
        AND EXISTS (
            SELECT 1 FROM public.users_raw u 
            WHERE u.id = progress_matrix.student_id 
              AND u.school_id = public.get_current_user_school_id()
        )
    )
);

-- D. BUILDINGS & SCHOOL EQUIPMENT
ALTER TABLE IF EXISTS public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.buildings FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "buildings_all" ON public.buildings;
DROP POLICY IF EXISTS "buildings_all_policy" ON public.buildings;
DROP POLICY IF EXISTS "buildings_select" ON public.buildings;
DROP POLICY IF EXISTS "buildings_modify" ON public.buildings;
DROP POLICY IF EXISTS "buildings_tenant_scoped" ON public.buildings;
DROP POLICY IF EXISTS "buildings_select_scoped" ON public.buildings;
DROP POLICY IF EXISTS "buildings_modify_scoped" ON public.buildings;

CREATE POLICY "buildings_select_scoped" ON public.buildings FOR SELECT TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());
CREATE POLICY "buildings_modify_scoped" ON public.buildings FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')))
WITH CHECK (public.is_master_admin() OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')));

ALTER TABLE IF EXISTS public.school_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.school_equipment FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_equipment_all" ON public.school_equipment;
DROP POLICY IF EXISTS "school_equipment_all_policy" ON public.school_equipment;
DROP POLICY IF EXISTS "school_equipment_tenant_scoped" ON public.school_equipment;
DROP POLICY IF EXISTS "Enable all for school_equipment" ON public.school_equipment;
DROP POLICY IF EXISTS "school_equipment_select_scoped" ON public.school_equipment;
DROP POLICY IF EXISTS "school_equipment_modify_scoped" ON public.school_equipment;

CREATE POLICY "school_equipment_select_scoped" ON public.school_equipment FOR SELECT TO authenticated, anon
USING (public.is_master_admin() OR school_id = public.get_current_user_school_id());
CREATE POLICY "school_equipment_modify_scoped" ON public.school_equipment FOR ALL TO authenticated, anon
USING (public.is_master_admin() OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')))
WITH CHECK (public.is_master_admin() OR (school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN ('admin', 'secretary')));

-- ------------------------------------------------------------------------------
-- 6. REMEDIATE FINDING 6: STRICT STORAGE SCOPING (GROOVELAB & CAMPUS ASSETS)
-- ------------------------------------------------------------------------------
-- GROOVELAB-ASSETS DELETES
DROP POLICY IF EXISTS "Allow authenticated deletes from groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped deletes from groovelab-assets" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from groovelab-assets"
ON storage.objects FOR DELETE TO authenticated, service_role
USING (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        OR (
            public.get_current_user_role() IN ('admin', 'secretary')
            AND (
                (storage.foldername(name))[1] = public.get_current_user_school_id()::text
                OR (
                    (storage.foldername(name))[1] = 'schools'
                    AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
                )
            )
        )
    )
);

-- CAMPUS-ASSETS UPDATES
DROP POLICY IF EXISTS "Allow authenticated updates to campus-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped updates to campus-assets" ON storage.objects;
CREATE POLICY "Allow scoped updates to campus-assets"
ON storage.objects FOR UPDATE TO authenticated, service_role
USING (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        OR (
            public.get_current_user_role() IN ('admin', 'secretary')
            AND (storage.foldername(name))[1] = public.get_current_user_school_id()::text
        )
    )
)
WITH CHECK (
    bucket_id = 'campus-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        OR (
            public.get_current_user_role() IN ('admin', 'secretary')
            AND (storage.foldername(name))[1] = public.get_current_user_school_id()::text
        )
    )
);

-- GROOVELAB-ASSETS UPDATES
DROP POLICY IF EXISTS "Allow authenticated updates to groovelab-assets" ON storage.objects;
DROP POLICY IF EXISTS "Allow scoped updates to groovelab-assets" ON storage.objects;
CREATE POLICY "Allow scoped updates to groovelab-assets"
ON storage.objects FOR UPDATE TO authenticated, service_role
USING (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        OR (
            public.get_current_user_role() IN ('admin', 'secretary')
            AND (storage.foldername(name))[1] = public.get_current_user_school_id()::text
        )
    )
)
WITH CHECK (
    bucket_id = 'groovelab-assets'
    AND name NOT LIKE '%..%'
    AND (
        public.is_master_admin()
        OR (storage.foldername(name))[1] = public.get_current_authenticated_user_id()::text
        OR (
            (storage.foldername(name))[1] = 'schools'
            AND (storage.foldername(name))[2] = public.get_current_user_school_id()::text
            AND public.get_current_user_role() IN ('admin', 'secretary', 'teacher')
        )
        OR (
            public.get_current_user_role() IN ('admin', 'secretary')
            AND (storage.foldername(name))[1] = public.get_current_user_school_id()::text
        )
    )
);

-- ------------------------------------------------------------------------------
-- 7. REMEDIATE FINDING 7: BLOCK PUBLIC INSERTS TO AUDIT & RATE-LIMIT TABLES
-- ------------------------------------------------------------------------------
-- A. AUDIT_LOGS
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_logs_insert_scoped" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_scoped" ON public.audit_logs
FOR INSERT TO authenticated, anon, service_role
WITH CHECK (
    public.is_master_admin()
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
);

-- B. MASTER_AUDIT_TRAIL (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'master_audit_trail') THEN
        EXECUTE 'ALTER TABLE public.master_audit_trail ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE public.master_audit_trail FORCE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "master_audit_insert" ON public.master_audit_trail;';
        EXECUTE 'CREATE POLICY "master_audit_insert" ON public.master_audit_trail FOR INSERT TO authenticated, anon WITH CHECK (public.is_master_admin() OR current_user IN (''postgres'', ''supabase_admin'', ''service_role''));';
    END IF;
END $$;

-- C. QR_LOGIN_RATE_LIMITS
ALTER TABLE IF EXISTS public.qr_login_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.qr_login_rate_limits FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_insert_rate_limit" ON public.qr_login_rate_limits;
DROP POLICY IF EXISTS "qr_login_rate_limits_deny_client_insert" ON public.qr_login_rate_limits;
CREATE POLICY "qr_login_rate_limits_deny_client_insert" ON public.qr_login_rate_limits
FOR INSERT TO anon, authenticated
WITH CHECK (
    public.is_master_admin()
    OR current_user IN ('postgres', 'supabase_admin', 'service_role')
);

-- ------------------------------------------------------------------------------
-- 8. REMEDIATE FINDING 8: RLS POLICIES FOR MISSION_TEMPLATES & STUDENT_MISSIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mission_templates') THEN
        EXECUTE 'ALTER TABLE public.mission_templates ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE public.mission_templates FORCE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "mission_templates_tenant_isolation" ON public.mission_templates;';
        EXECUTE 'CREATE POLICY "mission_templates_tenant_isolation" ON public.mission_templates FOR ALL TO authenticated, anon, service_role USING (public.is_master_admin() OR is_default = true OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id())) WITH CHECK (public.is_master_admin() OR (public.get_current_user_school_id() IS NOT NULL AND school_id = public.get_current_user_school_id() AND public.get_current_user_role() IN (''admin'', ''secretary'')));';
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_missions') THEN
        EXECUTE 'ALTER TABLE public.student_missions ENABLE ROW LEVEL SECURITY;';
        EXECUTE 'ALTER TABLE public.student_missions FORCE ROW LEVEL SECURITY;';
        EXECUTE 'DROP POLICY IF EXISTS "student_missions_tenant_isolation" ON public.student_missions;';
        EXECUTE 'CREATE POLICY "student_missions_tenant_isolation" ON public.student_missions FOR ALL TO authenticated, anon, service_role USING (public.is_master_admin() OR student_id = public.get_current_authenticated_user_id() OR (public.get_current_user_school_id() IS NOT NULL AND public.get_current_user_role() IN (''admin'', ''secretary'', ''teacher'') AND EXISTS (SELECT 1 FROM public.users_raw u WHERE u.id = student_missions.student_id AND u.school_id = public.get_current_user_school_id()))) WITH CHECK (public.is_master_admin() OR student_id = public.get_current_authenticated_user_id() OR (public.get_current_user_school_id() IS NOT NULL AND public.get_current_user_role() IN (''admin'', ''secretary'', ''teacher'') AND EXISTS (SELECT 1 FROM public.users_raw u WHERE u.id = student_missions.student_id AND u.school_id = public.get_current_user_school_id())));';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 9. REMEDIATE FINDING 9: PIN SEARCH_PATH ON ALL 10 SECURITY DEFINER FUNCTIONS
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_qr_token') THEN
        ALTER FUNCTION public.get_qr_token() SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_school_access') THEN
        ALTER FUNCTION public.check_school_access(uuid) SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'school_has_no_users') THEN
        ALTER FUNCTION public.school_has_no_users(uuid) SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'verify_photo_upload_pin') THEN
        ALTER FUNCTION public.verify_photo_upload_pin(uuid, text, text) SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_invite_token') THEN
        ALTER FUNCTION public.get_invite_token() SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_invite_school_id') THEN
        ALTER FUNCTION public.get_invite_school_id() SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_invite_token_use') THEN
        ALTER FUNCTION public.process_invite_token_use() SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_teacher_of_qr_student') THEN
        ALTER FUNCTION public.is_teacher_of_qr_student(uuid) SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_rate_limits') THEN
        ALTER FUNCTION public.cleanup_old_rate_limits() SET search_path = public, pg_temp, extensions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'trg_enforce_tariff_booking_immutability') THEN
        ALTER FUNCTION public.trg_enforce_tariff_booking_immutability() SET search_path = public, pg_temp, extensions;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 10. REMEDIATE FINDING 10: DROP LEFTOVER POLICIES ON PILOT & ONBOARDING TABLES
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'pilot_agreements') THEN
        DROP POLICY IF EXISTS "pilot_agreements_select" ON public.pilot_agreements;
        DROP POLICY IF EXISTS "pilot_agreements_insert" ON public.pilot_agreements;
        DROP POLICY IF EXISTS "pilot_agreements_update" ON public.pilot_agreements;
        DROP POLICY IF EXISTS "pilot_agreements_delete" ON public.pilot_agreements;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_onboarding_tokens') THEN
        DROP POLICY IF EXISTS "student_onboarding_tokens_select" ON public.student_onboarding_tokens;
        DROP POLICY IF EXISTS "student_onboarding_tokens_insert" ON public.student_onboarding_tokens;
        DROP POLICY IF EXISTS "student_onboarding_tokens_update" ON public.student_onboarding_tokens;
        DROP POLICY IF EXISTS "student_onboarding_tokens_delete" ON public.student_onboarding_tokens;
        DROP POLICY IF EXISTS "student_onboarding_tokens_all" ON public.student_onboarding_tokens;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
