-- ==============================================================================
-- Migration 321: Safe PGP Decryption Wrapper & Resilient Users View
-- Ensures zero query crashes even if key rotation or legacy bytea fragments exist
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.safe_pgp_sym_decrypt(encrypted_data bytea, primary_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp, extensions
AS $$
DECLARE
    v_result text;
BEGIN
    IF encrypted_data IS NULL THEN
        RETURN NULL;
    END IF;

    -- 1. Try with primary key
    BEGIN
        v_result := extensions.pgp_sym_decrypt(encrypted_data, primary_key);
        IF v_result IS NOT NULL THEN
            RETURN v_result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 2. Fallback to legacy default key
    BEGIN
        v_result := extensions.pgp_sym_decrypt(encrypted_data, 'groovelab-default-local-encryption-key-123!');
        IF v_result IS NOT NULL THEN
            RETURN v_result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    -- 3. Fallback to 2026 key
    BEGIN
        v_result := extensions.pgp_sym_decrypt(encrypted_data, 'campus_groovelab_master_vault_key_2026_aes256');
        IF v_result IS NOT NULL THEN
            RETURN v_result;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.safe_pgp_sym_decrypt(bytea, text) TO anon, authenticated, service_role;

-- Rebuild users view using safe_pgp_sym_decrypt
CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id, ur.school_id, ur.role, ur.first_name, 
    CASE 
      WHEN (public.get_current_authenticated_user_id() = ur.id) 
           OR public.is_master_admin() 
           OR public.get_current_user_role() IN ('teacher', 'admin', 'secretary') 
      THEN ur.last_name
      ELSE COALESCE(substring(ur.last_name from 1 for 1) || '.', '')
    END AS last_name,
    ur.avatar_url, ur.qr_token, ur.instrument, 
    ur.created_at, ur.coach_notes, ur.photo_url, ur.bio, ur.bands, ur.projects, ur.listening, ur.gear, 
    ur.musical_styles, ur.equipment_list, ur.last_seen, ur.expertise, ur.age, ur.birth_date, 
    ur.pending_repertoire_proposal, ur.is_external_vocalist, ur.show_messages_menu, 
    ur.master_admin_username, 
    CAST(NULL AS TEXT) AS master_admin_password,
    ur.is_trial, ur.trial_ends_at, 
    ur.contract_ends_at, ur.contract_decision_made, ur.delete_after_contract,
    ur.status, ur.is_master_admin, ur.is_app_user, ur.is_campus_active, 
    ur.is_groovelab_active, ur.is_premium_user, ur.teacher_id, ur.ausweis_nummer, 
    ur.teacher_qr_token, ur.is_active, ur.max_students, ur.nickname, 
    CAST(NULL AS TEXT) AS password_hash,
    ur.ausweis_id, ur.show_sekretariat, ur.show_campus, ur.show_groovelab, 
    ur.lesson_duration, ur.planned_boards, ur.required_equipment, ur.sick_until, ur.phone, 
    ur.joker_used, ur.is_pin_activated, ur.groovelab_räume, ur.campus_räume, ur.joker_used_at, 
    ur.sick_start, ur.push_notifications_enabled, ur.push_notif_schedule_changes, 
    ur.push_notif_homework, ur.push_notif_all_features, 
    ur.app_usage_mode, 
    ur.preferred_room_ids, ur.groovelab_instrument, ur.student_billing_payment_method, 
    ur.activated_at, ur.student_billing_cash_paid, ur.roles, ur.exempt_from_direct_billing, 
    ur.group_id, ur.sibling_group_id, 
    ur.parent_allow_chat, ur.parent_allow_timer, ur.parent_allow_leaderboard, ur.parent_allow_groups, ur.parent_allow_proposals, 
    ur.pin_enforced_for_preview, 
    ur.teacher_onboarding_completed, ur.teacher_availability,
    ur.is_2fa_enabled, 
    CAST(NULL AS TEXT) AS two_factor_secret,
    CAST(NULL AS TEXT) AS parent_pin, 
    CAST(NULL AS TEXT) AS personal_pin, 
    (ur.parent_pin IS NOT NULL AND ur.parent_pin <> '0000') AS has_parent_pin, 
    (ur.personal_pin IS NOT NULL AND ur.personal_pin <> '') AS has_personal_pin, 
    ur.failed_pin_attempts, ur.pin_locked_until,
    ur.sessions_revoked_at, ur.token_version, ur.token_signature, ur.qr_token_redeemed_at,
    (
        SELECT public.safe_pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;
