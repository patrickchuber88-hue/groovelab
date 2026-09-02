-- ==============================================================================
-- Migration 341: Fix public.users view security definer permissions
-- Resolves 'permission denied for table user_secrets' when querying public.users
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.user_has_parent_pin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, private_auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private_auth.user_secrets us 
    WHERE us.user_id = p_user_id 
      AND us.argon2_parent_pin_hash IS NOT NULL 
      AND us.argon2_parent_pin_hash <> ''
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_personal_pin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, private_auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM private_auth.user_secrets us 
    WHERE us.user_id = p_user_id 
      AND us.argon2_personal_pin_hash IS NOT NULL 
      AND us.argon2_personal_pin_hash <> ''
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_parent_pin(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_has_personal_pin(UUID) TO anon, authenticated, service_role;

-- Recreate public.users view
CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.id,
    ur.school_id,
    ur.role,
    ur.first_name,
    CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.last_name::text
        ELSE COALESCE(SUBSTRING(ur.last_name FROM 1 FOR 1) || '.', '')
    END AS last_name,
    ur.avatar_url,
    -- Zero-Leak Tokens: Only visible to self, master admin, or authorized school staff
    CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.qr_token
        ELSE NULL::uuid
    END AS qr_token,
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
    -- Zero-Leak Ausweisnummer
    (CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('teacher', 'admin', 'secretary'))
        THEN ur.ausweis_nummer
        ELSE NULL
    END)::character varying(255) AS ausweis_nummer,
    -- Zero-Leak Teacher QR Token: Only visible to self or school admin/secretary
    (CASE 
        WHEN public.get_current_authenticated_user_id() = ur.id 
             OR public.is_master_admin() 
             OR (public.get_current_user_school_id() = ur.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))
        THEN ur.teacher_qr_token
        ELSE NULL
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
    ur.phone,
    ur.joker_used,
    ur.is_pin_activated,
    ur.groovelab_räume,
    ur.campus_räume,
    ur.joker_used_at,
    ur.sick_start,
    ur.push_notifications_enabled,
    ur.push_notif_schedule_changes,
    ur.push_notif_homework,
    ur.push_notif_all_features,
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
    ur.pin_enforced_for_preview,
    ur.teacher_onboarding_completed,
    ur.teacher_availability,
    ur.is_2fa_enabled,
    NULL::text AS two_factor_secret,
    NULL::text AS parent_pin,
    NULL::text AS personal_pin,
    public.user_has_parent_pin(ur.id) AS has_parent_pin,
    public.user_has_personal_pin(ur.id) AS has_personal_pin,
    ur.failed_pin_attempts,
    ur.pin_locked_until,
    ur.sessions_revoked_at,
    ur.token_version,
    ur.token_signature,
    ur.qr_token_redeemed_at,
    (
        SELECT (public.safe_pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix)
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;

GRANT SELECT ON public.users TO authenticated, anon, service_role;
NOTIFY pgrst, 'reload schema';
