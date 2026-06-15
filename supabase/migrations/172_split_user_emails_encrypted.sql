-- Migration: Verschlüsselung von Mitarbeiter-E-Mails (Präfix/Suffix-Splitting)

-- 1. Tabellen für Mitarbeiter-E-Mail-Präfixe und -Suffixe anlegen
CREATE TABLE IF NOT EXISTS public.user_email_prefixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    prefix bytea NOT NULL
);

CREATE TABLE IF NOT EXISTS public.user_email_suffixes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    suffix VARCHAR(255) NOT NULL
);

-- RLS deaktivieren (wird über die View und Basis-Tabelle gesteuert)
ALTER TABLE public.user_email_prefixes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_suffixes DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.user_email_prefixes TO authenticated, anon, service_role;
GRANT ALL ON public.user_email_suffixes TO authenticated, anon, service_role;

-- 2. Bestehende users-Tabelle in users_raw umbenennen
ALTER TABLE public.users RENAME TO users_raw;

-- 3. Fremdschlüssel-Constraints für die E-Mail-Tabellen hinzufügen, die auf die umbenannte Tabelle verweisen
ALTER TABLE public.user_email_prefixes 
ADD CONSTRAINT fk_user_email_prefixes_user_id 
FOREIGN KEY (user_id) REFERENCES public.users_raw(id) ON DELETE CASCADE;

ALTER TABLE public.user_email_suffixes 
ADD CONSTRAINT fk_user_email_suffixes_user_id 
FOREIGN KEY (user_id) REFERENCES public.users_raw(id) ON DELETE CASCADE;

-- 4. Bestehende E-Mail-Adressen migrieren (Splitten und Verschlüsseln)
DO $$
DECLARE
    r RECORD;
    parts TEXT[];
    prefix_part TEXT;
    suffix_part TEXT;
BEGIN
    FOR r IN SELECT id, email FROM public.users_raw WHERE email IS NOT NULL AND email LIKE '%@%' LOOP
        parts := string_to_array(r.email, '@');
        prefix_part := parts[1];
        suffix_part := parts[2];
        
        INSERT INTO public.user_email_prefixes (user_id, prefix)
        VALUES (r.id, pgp_sym_encrypt(prefix_part, public.get_encryption_key()));
        
        INSERT INTO public.user_email_suffixes (user_id, suffix)
        VALUES (r.id, suffix_part);
    END LOOP;
END $$;

-- 5. Die Klartext-E-Mail-Spalte aus der Basis-Tabelle users_raw löschen
ALTER TABLE public.users_raw DROP COLUMN email;

-- 6. Die View public.users erstellen, die E-Mails on-the-fly entschlüsselt und zusammensetzt
CREATE OR REPLACE VIEW public.users WITH (security_invoker = true) AS
SELECT 
    ur.*,
    (
        SELECT pgp_sym_decrypt(uep.prefix, public.get_encryption_key()) || '@' || ues.suffix
        FROM public.user_email_prefixes uep
        JOIN public.user_email_suffixes ues ON uep.user_id = ues.user_id
        WHERE uep.user_id = ur.id
        LIMIT 1
    ) AS email
FROM public.users_raw ur;

-- 7. Trigger-Funktion für DML-Operationen auf der View public.users
CREATE OR REPLACE FUNCTION public.handle_users_view_dml()
RETURNS TRIGGER AS $$
DECLARE
    email_parts TEXT[];
    email_prefix TEXT;
    email_suffix TEXT;
    r_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Einfügen in die echte Tabelle users_raw
        INSERT INTO public.users_raw (
            id, school_id, role, first_name, last_name, avatar_url, qr_token, instrument, 
            created_at, coach_notes, photo_url, bio, bands, projects, listening, gear, 
            musical_styles, equipment_list, last_seen, expertise, age, birth_date, 
            pending_repertoire_proposal, is_external_vocalist, show_messages_menu, 
            master_admin_username, master_admin_password, is_trial, trial_ends_at, 
            contract_ends_at, status, is_master_admin, is_app_user, is_campus_active, 
            is_groovelab_active, is_premium_user, teacher_id, ausweis_nummer, 
            teacher_qr_token, is_active, max_students, nickname, password_hash, 
            ausweis_id, personal_pin, show_sekretariat, show_campus, show_groovelab, 
            lesson_duration, planned_boards, required_equipment, sick_until, phone, 
            joker_used, is_pin_activated, groovelab_räume, campus_räume, joker_used_at, 
            sick_start, push_notifications_enabled, push_notif_schedule_changes, 
            push_notif_homework, push_notif_all_features, app_usage_mode, 
            preferred_room_ids, groovelab_instrument, student_billing_payment_method, 
            activated_at, student_billing_cash_paid, roles
        ) VALUES (
            COALESCE(NEW.id, gen_random_uuid()), NEW.school_id, NEW.role, NEW.first_name, NEW.last_name, NEW.avatar_url, NEW.qr_token, NEW.instrument,
            COALESCE(NEW.created_at, NOW()), NEW.coach_notes, NEW.photo_url, NEW.bio, NEW.bands, NEW.projects, NEW.listening, NEW.gear,
            NEW.musical_styles, NEW.equipment_list, NEW.last_seen, NEW.expertise, NEW.age, NEW.birth_date,
            NEW.pending_repertoire_proposal, NEW.is_external_vocalist, NEW.show_messages_menu,
            NEW.master_admin_username, NEW.master_admin_password, NEW.is_trial, NEW.trial_ends_at,
            NEW.contract_ends_at, NEW.status, NEW.is_master_admin, NEW.is_app_user, NEW.is_campus_active,
            NEW.is_groovelab_active, NEW.is_premium_user, NEW.teacher_id, NEW.ausweis_nummer,
            NEW.teacher_qr_token, NEW.is_active, NEW.max_students, NEW.nickname, NEW.password_hash,
            NEW.ausweis_id, NEW.personal_pin, NEW.show_sekretariat, NEW.show_campus, NEW.show_groovelab,
            NEW.lesson_duration, NEW.planned_boards, NEW.required_equipment, NEW.sick_until, NEW.phone,
            NEW.joker_used, NEW.is_pin_activated, NEW.groovelab_räume, NEW.campus_räume, NEW.joker_used_at,
            NEW.sick_start, NEW.push_notifications_enabled, NEW.push_notif_schedule_changes,
            NEW.push_notif_homework, NEW.push_notif_all_features, NEW.app_usage_mode,
            NEW.preferred_room_ids, NEW.groovelab_instrument, NEW.student_billing_payment_method,
            NEW.activated_at, NEW.student_billing_cash_paid, NEW.roles
        ) RETURNING id INTO r_id;

        -- E-Mail-Adresse splitten und verschlüsselt speichern (falls vorhanden)
        IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
            email_parts := string_to_array(NEW.email, '@');
            email_prefix := email_parts[1];
            email_suffix := email_parts[2];
            
            INSERT INTO public.user_email_prefixes (user_id, prefix)
            VALUES (r_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
            
            INSERT INTO public.user_email_suffixes (user_id, suffix)
            VALUES (r_id, email_suffix);
        END IF;

        -- Zwischengespeicherte Zeile aus der View zurückgeben
        SELECT * INTO NEW FROM public.users WHERE id = r_id;
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- users_raw aktualisieren
        UPDATE public.users_raw SET
            school_id = NEW.school_id,
            role = NEW.role,
            first_name = NEW.first_name,
            last_name = NEW.last_name,
            avatar_url = NEW.avatar_url,
            qr_token = NEW.qr_token,
            instrument = NEW.instrument,
            created_at = NEW.created_at,
            coach_notes = NEW.coach_notes,
            photo_url = NEW.photo_url,
            bio = NEW.bio,
            bands = NEW.bands,
            projects = NEW.projects,
            listening = NEW.listening,
            gear = NEW.gear,
            musical_styles = NEW.musical_styles,
            equipment_list = NEW.equipment_list,
            last_seen = NEW.last_seen,
            expertise = NEW.expertise,
            age = NEW.age,
            birth_date = NEW.birth_date,
            pending_repertoire_proposal = NEW.pending_repertoire_proposal,
            is_external_vocalist = NEW.is_external_vocalist,
            show_messages_menu = NEW.show_messages_menu,
            master_admin_username = NEW.master_admin_username,
            master_admin_password = NEW.master_admin_password,
            is_trial = NEW.is_trial,
            trial_ends_at = NEW.trial_ends_at,
            contract_ends_at = NEW.contract_ends_at,
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
            password_hash = NEW.password_hash,
            ausweis_id = NEW.ausweis_id,
            personal_pin = NEW.personal_pin,
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
            groovelab_räume = NEW.groovelab_räume,
            campus_räume = NEW.campus_räume,
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
            roles = NEW.roles
        WHERE id = OLD.id;

        -- E-Mail-Adresse aktualisieren, falls geändert
        IF NEW.email IS DISTINCT FROM OLD.email THEN
            DELETE FROM public.user_email_prefixes WHERE user_id = OLD.id;
            DELETE FROM public.user_email_suffixes WHERE user_id = OLD.id;
            
            IF NEW.email IS NOT NULL AND NEW.email LIKE '%@%' THEN
                email_parts := string_to_array(NEW.email, '@');
                email_prefix := email_parts[1];
                email_suffix := email_parts[2];
                
                INSERT INTO public.user_email_prefixes (user_id, prefix)
                VALUES (OLD.id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
                
                INSERT INTO public.user_email_suffixes (user_id, suffix)
                VALUES (OLD.id, email_suffix);
            END IF;
        END IF;

        SELECT * INTO NEW FROM public.users WHERE id = OLD.id;
        RETURN NEW;

    ELSIF TG_OP = 'DELETE' THEN
        DELETE FROM public.users_raw WHERE id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger an public.users View anbinden
DROP TRIGGER IF EXISTS trg_users_view_dml ON public.users;
CREATE TRIGGER trg_users_view_dml
INSTEAD OF INSERT OR UPDATE OR DELETE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.handle_users_view_dml();

-- Relaod PostgREST Cache
NOTIFY pgrst, 'reload schema';
