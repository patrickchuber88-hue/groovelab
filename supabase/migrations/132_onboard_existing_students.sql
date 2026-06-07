-- Migration: Onboard existing students into the 5-table anonymized structure
DO $$
DECLARE
    r RECORD;
    email_prefix TEXT;
    email_suffix TEXT;
    day_part INT;
BEGIN
    FOR r IN 
        SELECT id, school_id, teacher_id, first_name, last_name, email, instrument, birth_date
        FROM public.users
        WHERE role = 'student'
          AND id NOT IN (SELECT id FROM public.students)
    LOOP
        -- Splitting email to extract prefix and suffix
        email_prefix := COALESCE(NULLIF(split_part(r.email, '@', 1), ''), 'unknown');
        email_suffix := COALESCE(NULLIF(split_part(r.email, '@', 2), ''), 'example.com');
        
        -- Extraction of birth day or fallback to 1
        IF r.birth_date IS NOT NULL THEN
            day_part := EXTRACT(DAY FROM r.birth_date)::integer;
            IF day_part < 1 OR day_part > 31 THEN
                day_part := 1;
            END IF;
        ELSE
            day_part := 1;
        END IF;

        -- 1. Insert into students (set status to 'verplant' since they are already active students)
        INSERT INTO public.students (id, school_id, teacher_id, instrument, status, created_at)
        VALUES (r.id, r.school_id, r.teacher_id, COALESCE(r.instrument, 'Klavier'), 'verplant', NOW())
        ON CONFLICT (id) DO NOTHING;

        -- 2. Insert into student_names
        IF NOT EXISTS (SELECT 1 FROM public.student_names WHERE student_id = r.id) THEN
            INSERT INTO public.student_names (student_id, first_name, last_name)
            VALUES (r.id, COALESCE(r.first_name, 'Schüler'), COALESCE(r.last_name, 'Name'));
        END IF;

        -- 3. Insert into email_prefixes
        IF NOT EXISTS (SELECT 1 FROM public.email_prefixes WHERE student_id = r.id) THEN
            INSERT INTO public.email_prefixes (student_id, prefix)
            VALUES (r.id, email_prefix);
        END IF;

        -- 4. Insert into email_suffixes
        IF NOT EXISTS (SELECT 1 FROM public.email_suffixes WHERE student_id = r.id) THEN
            INSERT INTO public.email_suffixes (student_id, suffix)
            VALUES (r.id, email_suffix);
        END IF;

        -- 5. Insert into activation_days
        IF NOT EXISTS (SELECT 1 FROM public.activation_days WHERE student_id = r.id) THEN
            INSERT INTO public.activation_days (student_id, day_of_birth)
            VALUES (r.id, day_part);
        END IF;
    END LOOP;
END $$;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
