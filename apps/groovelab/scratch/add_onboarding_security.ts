import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.env.local';
const env = fs.readFileSync(envPath, 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)![1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)![1].trim();
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(url, SERVICE_KEY);

async function main() {
  console.log('Running database migrations for onboarding security hardening...');
  
  const ddl = `
    -- 1. Add columns to public.students
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS onboarding_pin TEXT;
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS onboarding_frozen BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.students ADD COLUMN IF NOT EXISTS timetable_assigned_at TIMESTAMP WITH TIME ZONE;

    -- 2. Create student_onboarding_tokens table
    CREATE TABLE IF NOT EXISTS public.student_onboarding_tokens (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        student_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
        token UUID DEFAULT gen_random_uuid() UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        used_at TIMESTAMP WITH TIME ZONE
    );

    -- 3. Redefine verify_onboarding to check frozen and pin status
    CREATE OR REPLACE FUNCTION public.verify_onboarding(
        input_first_name TEXT,
        input_last_name TEXT,
        input_instrument TEXT,
        input_day INT
    )
    RETURNS TABLE (
        success BOOLEAN,
        student_id UUID,
        message TEXT
    ) AS $$
    DECLARE
        client_ip TEXT;
        recent_attempts INT;
        matched_student_id UUID;
        is_frozen BOOLEAN;
        has_pin BOOLEAN;
    BEGIN
        client_ip := COALESCE(
            current_setting('request.headers', true)::jsonb->>'x-forwarded-for',
            '127.0.0.1'
        );

        DELETE FROM public.onboarding_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';

        SELECT COUNT(*)::INT INTO recent_attempts
        FROM public.onboarding_attempts
        WHERE ip_address = client_ip;

        IF recent_attempts >= 5 THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.';
            RETURN;
        END IF;

        SELECT s.id, s.onboarding_frozen, (s.onboarding_pin IS NOT NULL)
        INTO matched_student_id, is_frozen, has_pin
        FROM public.students s
        JOIN public.student_first_names sfn ON s.id = sfn.student_id
        JOIN public.student_last_names sln ON s.id = sln.student_id
        JOIN public.activation_days ad ON s.id = ad.student_id
        WHERE pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) ILIKE input_first_name
          AND sln.last_name ILIKE input_last_name
          AND s.instrument = input_instrument
          AND ad.day_of_birth = input_day
        LIMIT 1;

        IF matched_student_id IS NOT NULL THEN
            DELETE FROM public.onboarding_attempts WHERE ip_address = client_ip;
            
            IF is_frozen THEN
                RETURN QUERY SELECT FALSE, matched_student_id, 'frozen';
            ELSIF has_pin THEN
                RETURN QUERY SELECT FALSE, matched_student_id, 'pin_required';
            ELSE
                RETURN QUERY SELECT TRUE, matched_student_id, 'Verifiziert';
            END IF;
        ELSE
            INSERT INTO public.onboarding_attempts (ip_address) VALUES (client_ip);
            RETURN QUERY SELECT FALSE, NULL::UUID, 'Eingabe überprüfen';
        END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

    -- 4. Create verify_onboarding_pin RPC
    CREATE OR REPLACE FUNCTION public.verify_onboarding_pin(
        input_student_id UUID,
        input_pin TEXT
    )
    RETURNS TABLE (
        success BOOLEAN,
        message TEXT
    ) AS $$
    DECLARE
        stored_pin TEXT;
        is_frozen BOOLEAN;
    BEGIN
        SELECT onboarding_pin, onboarding_frozen INTO stored_pin, is_frozen
        FROM public.students
        WHERE id = input_student_id;

        IF is_frozen THEN
            RETURN QUERY SELECT FALSE, 'frozen';
            RETURN;
        END IF;

        IF stored_pin IS NULL THEN
            RETURN QUERY SELECT TRUE, 'Keine PIN gesetzt';
            RETURN;
        END IF;

        IF stored_pin = crypt(input_pin, stored_pin) THEN
            RETURN QUERY SELECT TRUE, 'PIN korrekt';
        ELSE
            RETURN QUERY SELECT FALSE, 'Falsche PIN';
        END IF;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

    -- 5. Create verify_onboarding_token RPC
    CREATE OR REPLACE FUNCTION public.verify_onboarding_token(
        input_token UUID
    )
    RETURNS TABLE (
        success BOOLEAN,
        student_id UUID,
        first_name TEXT,
        last_name TEXT,
        instrument TEXT,
        message TEXT
    ) AS $$
    DECLARE
        tok_rec RECORD;
        target_first TEXT;
        target_last TEXT;
        target_instr TEXT;
    BEGIN
        SELECT * INTO tok_rec
        FROM public.student_onboarding_tokens
        WHERE token = input_token AND used_at IS NULL;

        IF tok_rec.id IS NULL THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, 'Ungültiger oder bereits verwendeter Link.';
            RETURN;
        END IF;

        SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) INTO target_first
        FROM public.student_first_names sfn WHERE sfn.student_id = tok_rec.student_id;

        SELECT sln.last_name INTO target_last
        FROM public.student_last_names sln WHERE sln.student_id = tok_rec.student_id;

        SELECT s.instrument INTO target_instr
        FROM public.students s WHERE s.id = tok_rec.student_id;

        RETURN QUERY SELECT TRUE, tok_rec.student_id, target_first, target_last, target_instr, 'Token verifiziert';
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

    -- 6. Create freeze_onboarding_profile RPC
    CREATE OR REPLACE FUNCTION public.freeze_onboarding_profile(
        input_student_id UUID
    )
    RETURNS BOOLEAN AS $$
    BEGIN
        UPDATE public.students
        SET onboarding_frozen = TRUE
        WHERE id = input_student_id;
        
        UPDATE public.users
        SET is_active = FALSE
        WHERE id = input_student_id;
        
        RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

    -- 7. Redefine complete_onboarding
    DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT);
    DROP FUNCTION IF EXISTS public.complete_onboarding(UUID, TEXT, TEXT);

    CREATE OR REPLACE FUNCTION public.complete_onboarding(
        input_student_id UUID,
        input_email TEXT,
        input_pin TEXT DEFAULT NULL
    )
    RETURNS BOOLEAN AS $$
    DECLARE
        email_parts TEXT[];
        email_prefix TEXT;
        email_suffix TEXT;
        target_school_id UUID;
        target_teacher_id UUID;
        target_instrument TEXT;
        target_first_name TEXT;
        target_last_name TEXT;
        new_qr_token UUID;
    BEGIN
        SELECT school_id, teacher_id, instrument INTO target_school_id, target_teacher_id, target_instrument
        FROM public.students
        WHERE id = input_student_id;

        IF target_school_id IS NULL THEN
            RAISE EXCEPTION 'Student existiert nicht.';
        END IF;

        IF input_email IS NOT NULL AND TRIM(input_email) != '' THEN
            email_parts := regexp_split_to_array(TRIM(input_email), '@');
            IF array_length(email_parts, 1) != 2 THEN
                RAISE EXCEPTION 'Ungültiges E-Mail-Format.';
            END IF;

            email_prefix := email_parts[1];
            email_suffix := email_parts[2];

            DELETE FROM public.email_prefixes WHERE student_id = input_student_id;
            DELETE FROM public.email_suffixes WHERE student_id = input_student_id;

            INSERT INTO public.email_prefixes (student_id, prefix)
            VALUES (input_student_id, pgp_sym_encrypt(email_prefix, public.get_encryption_key()));

            INSERT INTO public.email_suffixes (student_id, suffix)
            VALUES (input_student_id, email_suffix);
        END IF;

        UPDATE public.students
        SET status = 'verplant',
            onboarding_frozen = FALSE,
            onboarding_pin = COALESCE(crypt(input_pin, gen_salt('bf')), onboarding_pin)
        WHERE id = input_student_id;

        SELECT pgp_sym_decrypt(sfn.first_name, public.get_encryption_key()) INTO target_first_name
        FROM public.student_first_names sfn
        WHERE sfn.student_id = input_student_id;

        SELECT sln.last_name INTO target_last_name
        FROM public.student_last_names sln
        WHERE sln.student_id = input_student_id;

        new_qr_token := gen_random_uuid();
        
        IF EXISTS (SELECT 1 FROM public.users WHERE id = input_student_id) THEN
            UPDATE public.users SET
                email = NULL,
                qr_token = COALESCE(users.qr_token, new_qr_token),
                is_active = TRUE,
                is_app_user = TRUE,
                is_campus_active = TRUE,
                is_groovelab_active = TRUE,
                status = 'active'
            WHERE id = input_student_id;
        ELSE
            INSERT INTO public.users (
                id, school_id, teacher_id, role, first_name, last_name, email, instrument, qr_token,
                is_active, is_app_user, is_campus_active, is_groovelab_active, status, ausweis_nummer
            )
            VALUES (
                input_student_id, target_school_id, target_teacher_id, 'student', target_first_name, target_last_name, NULL, target_instrument, new_qr_token,
                TRUE, TRUE, TRUE, TRUE, 'active', 'GL-' || floor(1000 + random() * 9000)::text
            );
        END IF;

        INSERT INTO public.avatars (user_id, avatar_style, instrument_type, evolution_level, asset_path)
        VALUES (input_student_id, 'Standard_Silhouette', target_instrument, 1, '/avatars/silhouette_default.png')
        ON CONFLICT (user_id) DO NOTHING;

        UPDATE public.student_onboarding_tokens
        SET used_at = NOW()
        WHERE student_id = input_student_id AND used_at IS NULL;

        RETURN TRUE;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, extensions;

    -- Erteile Berechtigungen für complete_onboarding
    GRANT EXECUTE ON FUNCTION public.complete_onboarding(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.verify_onboarding_pin(UUID, TEXT) TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.verify_onboarding_token(UUID) TO anon, authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.freeze_onboarding_profile(UUID) TO anon, authenticated, service_role;
  `;
  
  const { error } = await supabase.rpc('execute_sql', { sql_query: ddl });
  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
  console.log('Migration completed successfully.');
}

main();
