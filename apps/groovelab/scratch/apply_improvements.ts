import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from apps/groovelab/.env.local
dotenv.config({ path: 'apps/groovelab/.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your env files!");
  process.exit(1);
}

// Using the service role key to perform administrative database operations (DDL / Security settings)
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(supabaseUrl, SERVICE_KEY);

const sql = `
-- 1. Alter authenticator role search path
ALTER ROLE authenticator SET search_path TO public, extensions;

-- 2. Create compound index on campus_event_program_points
CREATE INDEX IF NOT EXISTS idx_program_points_timeline 
ON public.campus_event_program_points(event_id, stage_number, sort_order);

-- 3. Create invite_tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  is_used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  expired_at TIMESTAMP WITH TIME ZONE
);

GRANT ALL ON public.invite_tokens TO authenticated, anon, service_role;

-- 4. Enable RLS on invite_tokens and add policies
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invite_tokens_master ON public.invite_tokens;
CREATE POLICY invite_tokens_master ON public.invite_tokens
  FOR ALL
  USING (public.is_master_admin());

DROP POLICY IF EXISTS invite_tokens_school_admin ON public.invite_tokens;
CREATE POLICY invite_tokens_school_admin ON public.invite_tokens
  FOR ALL
  USING (public.get_user_school_id() = school_id AND public.is_teacher_or_admin());

-- 5. Create validate_invite_token function
CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT, p_school_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.invite_tokens 
    WHERE token = p_token 
      AND school_id = p_school_id 
      AND is_used = FALSE 
      AND (expired_at IS NULL OR expired_at > now())
  );
END;
$$;

-- 6. Replace users_insert policy on public.users_raw
DROP POLICY IF EXISTS users_insert ON public.users_raw;

CREATE POLICY users_insert ON public.users_raw
FOR INSERT
WITH CHECK (
    is_master_admin()
    OR ((get_user_school_id() = school_id) AND is_teacher_or_admin())
    OR school_has_no_users(school_id)
    OR validate_invite_token(
        ((current_setting('request.headers'::text, true))::json ->> 'x-invite-token'::text),
        school_id
    )
);

-- 7. Create AFTER INSERT ON public.users_raw trigger function and trigger
CREATE OR REPLACE FUNCTION public.handle_users_raw_insert_after()
RETURNS TRIGGER AS $$
DECLARE
  v_headers_text TEXT;
  v_token TEXT;
BEGIN
  v_headers_text := current_setting('request.headers', true);
  IF v_headers_text IS NOT NULL AND v_headers_text <> '' THEN
    BEGIN
      v_token := (v_headers_text::json ->> 'x-invite-token');
    EXCEPTION WHEN OTHERS THEN
      v_token := NULL;
    END;
    
    IF v_token IS NOT NULL THEN
      UPDATE public.invite_tokens
      SET is_used = TRUE
      WHERE token = v_token
        AND school_id = NEW.school_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_users_insert_after ON public.users_raw;
CREATE TRIGGER trg_users_insert_after
AFTER INSERT ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.handle_users_raw_insert_after();

-- 8. Redefine handle_users_view_dml to use extensions.pgp_sym_encrypt
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
            VALUES (r_id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
            
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
                VALUES (OLD.id, extensions.pgp_sym_encrypt(email_prefix, public.get_encryption_key()));
                
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

-- 9. Create helper functions
CREATE OR REPLACE FUNCTION public.parse_time_to_minutes(p_time TEXT)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_parts TEXT[];
  v_hours INT;
  v_mins INT;
BEGIN
  IF p_time IS NULL OR p_time = '' THEN
    RETURN 0;
  END IF;
  
  v_parts := string_to_array(p_time, ':');
  
  BEGIN
    v_hours := COALESCE(v_parts[1]::INT, 0);
  EXCEPTION WHEN OTHERS THEN
    v_hours := 0;
  END;
  
  BEGIN
    v_mins := COALESCE(v_parts[2]::INT, 0);
  EXCEPTION WHEN OTHERS THEN
    v_mins := 0;
  END;
  
  RETURN v_hours * 60 + v_mins;
END;
$$;

CREATE OR REPLACE FUNCTION public.format_minutes_to_time(p_minutes INT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_hours INT;
  v_mins INT;
BEGIN
  IF p_minutes IS NULL THEN
    RETURN '00:00';
  END IF;
  
  v_hours := (p_minutes / 60) % 24;
  v_mins := p_minutes % 60;
  
  IF v_hours < 0 THEN
    v_hours := v_hours + 24;
  END IF;
  IF v_mins < 0 THEN
    v_mins := v_mins + 60;
  END IF;
  
  RETURN to_char(v_hours, 'FM00') || ':' || to_char(v_mins, 'FM00');
END;
$$;

-- 10. Create get_schedule_conflicts function
CREATE OR REPLACE FUNCTION public.get_schedule_conflicts(
  p_event_id UUID,
  p_transition_time INT DEFAULT 10
)
RETURNS TABLE (
  program_point_id UUID,
  conflict_type TEXT,
  conflict_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event RECORD;
  v_start_min INT;
  v_stage_num INT;
  v_rec RECORD;
  v_current_min INT;
  v_idx INT;
  v_prev_is_pause BOOLEAN;
BEGIN
  -- Clear temp table if it exists
  DROP TABLE IF EXISTS temp_pp_times;

  -- 1. Fetch event info
  SELECT event_date, start_time 
  INTO v_event 
  FROM public.campus_events 
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_start_min := public.parse_time_to_minutes(coalesce(to_char(v_event.start_time, 'HH24:MI'), '14:00'));
  
  -- Create a temporary table to hold calculated times
  CREATE TEMP TABLE temp_pp_times (
    pp_id UUID,
    stage_number INT,
    teacher_id UUID,
    is_pause BOOLEAN,
    start_min INT,
    end_min INT
  ) ON COMMIT DROP;
  
  -- Loop through each stage
  FOR v_stage_num IN 
    SELECT DISTINCT stage_number 
    FROM public.campus_event_program_points 
    WHERE event_id = p_event_id 
      AND (is_scheduled = TRUE OR is_pause = TRUE)
    ORDER BY stage_number
  LOOP
    v_current_min := v_start_min;
    v_idx := 0;
    v_prev_is_pause := FALSE;
    
    FOR v_rec IN 
      SELECT id, duration, is_pause, teacher_id 
      FROM public.campus_event_program_points 
      WHERE event_id = p_event_id 
        AND stage_number = v_stage_num 
        AND (is_scheduled = TRUE OR is_pause = TRUE)
      ORDER BY sort_order
    LOOP
      IF v_idx > 0 AND NOT v_rec.is_pause AND NOT v_prev_is_pause THEN
        v_current_min := v_current_min + p_transition_time;
      END IF;
      
      INSERT INTO temp_pp_times (pp_id, stage_number, teacher_id, is_pause, start_min, end_min)
      VALUES (v_rec.id, v_stage_num, v_rec.teacher_id, v_rec.is_pause, v_current_min, v_current_min + v_rec.duration);
      
      v_current_min := v_current_min + v_rec.duration;
      v_idx := v_idx + 1;
      v_prev_is_pause := v_rec.is_pause;
    END LOOP;
  END LOOP;
  
  -- Now find conflicts
  RETURN QUERY
  -- 1. Lesson conflicts
  SELECT 
    t.pp_id AS program_point_id,
    'lesson'::TEXT AS conflict_type,
    ('Kollision mit Unterricht (' || to_char(l.start_time, 'HH24:MI') || ' - ' || public.format_minutes_to_time(public.parse_time_to_minutes(l.start_time::text) + l.duration) || ')')::TEXT AS conflict_message
  FROM temp_pp_times t
  JOIN public.lessons l ON l.teacher_id = t.teacher_id AND l.date = v_event.event_date
  WHERE NOT t.is_pause 
    AND t.teacher_id IS NOT NULL
    AND (l.status IS NULL OR (l.status NOT LIKE 'cancel%' AND l.status <> 'teacher_sick'))
    AND t.start_min < (public.parse_time_to_minutes(l.start_time::text) + l.duration)
    AND t.end_min > public.parse_time_to_minutes(l.start_time::text)
    
  UNION ALL
  
  -- 2. Stage conflicts
  SELECT 
    t1.pp_id AS program_point_id,
    'stage'::TEXT AS conflict_type,
    ('Kollision mit Beitrag auf Bühne ' || t2.stage_number || ' (' || public.format_minutes_to_time(t2.start_min) || ' - ' || public.format_minutes_to_time(t2.end_min) || ')')::TEXT AS conflict_message
  FROM temp_pp_times t1
  JOIN temp_pp_times t2 ON t1.teacher_id = t2.teacher_id 
  WHERE NOT t1.is_pause 
    AND NOT t2.is_pause
    AND t1.teacher_id IS NOT NULL
    AND t1.pp_id <> t2.pp_id
    AND t1.stage_number <> t2.stage_number
    AND t1.start_min < t2.end_min
    AND t1.end_min > t2.start_min;
    
  -- Clean up
  DROP TABLE IF EXISTS temp_pp_times;
END;
$$;

-- Reload schema notify
NOTIFY pgrst, 'reload schema';
`;

async function apply() {
  console.log("Sending SQL script to Supabase RPC...");
  let { data, error } = await supabase.rpc('exec_sql', { query: sql });
  if (error) {
    console.warn("exec_sql RPC failed, trying execute_sql fallback...", error);
    const fallbackRes = await supabase.rpc('execute_sql', { sql_query: sql });
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    console.error("❌ SQL Execution failed:", error);
    process.exit(1);
  } else {
    console.log("✅ SQL Executed successfully:", data);
  }
}

apply();
