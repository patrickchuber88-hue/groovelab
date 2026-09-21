-- ==============================================================================
-- Migration 444: Enterprise Multi-Tenant Composite Foreign Keys & Engine Hardening
-- Standards: OWASP ASVS Level 3 / Multi-Tenancy Goldstandard / BSI TR-03116
-- Scope: Enforces (id, school_id) composite constraints on relational tables
-- to physically prevent cross-tenant assignment/leakage on PostgreSQL engine level.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Ensure Composite UNIQUE constraints on Parent Tables
    -- (Required as the target for composite foreign keys)

    -- A. users_raw (id, school_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_users_raw_id_school' AND conrelid = 'public.users_raw'::regclass
    ) THEN
        ALTER TABLE public.users_raw 
        ADD CONSTRAINT uq_users_raw_id_school UNIQUE (id, school_id);
    END IF;

    -- B. students (id, school_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_students_id_school' AND conrelid = 'public.students'::regclass
    ) THEN
        ALTER TABLE public.students 
        ADD CONSTRAINT uq_students_id_school UNIQUE (id, school_id);
    END IF;

    -- C. rooms (id, school_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_rooms_id_school' AND conrelid = 'public.rooms'::regclass
    ) THEN
        ALTER TABLE public.rooms 
        ADD CONSTRAINT uq_rooms_id_school UNIQUE (id, school_id);
    END IF;

    -- D. bands (id, school_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bands') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'uq_bands_id_school' AND conrelid = 'public.bands'::regclass
        ) THEN
            ALTER TABLE public.bands 
            ADD CONSTRAINT uq_bands_id_school UNIQUE (id, school_id);
        END IF;
    END IF;

    -- 2. Composite Foreign Keys on Child Tables
    -- Ensures child records MUST belong to the EXACT SAME school_id as the referenced parent record

    -- A. user_song_skills -> users_raw(id, school_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_song_skills') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'user_song_skills' AND column_name = 'school_id'
        ) THEN
            ALTER TABLE public.user_song_skills ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
            UPDATE public.user_song_skills uss
            SET school_id = u.school_id
            FROM public.users_raw u
            WHERE uss.user_id = u.id AND uss.school_id IS NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_user_song_skills_user_school' AND conrelid = 'public.user_song_skills'::regclass
        ) THEN
            ALTER TABLE public.user_song_skills 
            ADD CONSTRAINT fk_user_song_skills_user_school 
            FOREIGN KEY (user_id, school_id) 
            REFERENCES public.users_raw(id, school_id) 
            ON DELETE CASCADE;
        END IF;
    END IF;

    -- B. progress_matrix -> users_raw(id, school_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'progress_matrix') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'progress_matrix' AND column_name = 'school_id'
        ) THEN
            ALTER TABLE public.progress_matrix ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
            UPDATE public.progress_matrix pm
            SET school_id = u.school_id
            FROM public.users_raw u
            WHERE pm.student_id = u.id AND pm.school_id IS NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_progress_matrix_student_school' AND conrelid = 'public.progress_matrix'::regclass
        ) THEN
            ALTER TABLE public.progress_matrix 
            ADD CONSTRAINT fk_progress_matrix_student_school 
            FOREIGN KEY (student_id, school_id) 
            REFERENCES public.users_raw(id, school_id) 
            ON DELETE CASCADE;
        END IF;
    END IF;

    -- C. stations -> rooms(id, school_id)
    -- Ensure stations has school_id column if not present
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stations') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'stations' AND column_name = 'school_id'
        ) THEN
            ALTER TABLE public.stations ADD COLUMN school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;
            -- Backfill stations.school_id from rooms
            UPDATE public.stations s
            SET school_id = r.school_id
            FROM public.rooms r
            WHERE s.room_id = r.id AND s.school_id IS NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_stations_room_school' AND conrelid = 'public.stations'::regclass
        ) THEN
            ALTER TABLE public.stations 
            ADD CONSTRAINT fk_stations_room_school 
            FOREIGN KEY (room_id, school_id) 
            REFERENCES public.rooms(id, school_id) 
            ON DELETE CASCADE;
        END IF;
    END IF;

    -- D. lessons -> students(id, school_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lessons') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_lessons_student_school' AND conrelid = 'public.lessons'::regclass
        ) THEN
            -- Only add if student_id and school_id exist on lessons
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'student_id')
               AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'school_id') THEN
                ALTER TABLE public.lessons 
                ADD CONSTRAINT fk_lessons_student_school 
                FOREIGN KEY (student_id, school_id) 
                REFERENCES public.students(id, school_id) 
                ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- E. assignments -> students(id, school_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assignments') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_assignments_student_school' AND conrelid = 'public.assignments'::regclass
        ) THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'student_id')
               AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'school_id') THEN
                ALTER TABLE public.assignments 
                ADD CONSTRAINT fk_assignments_student_school 
                FOREIGN KEY (student_id, school_id) 
                REFERENCES public.students(id, school_id) 
                ON DELETE CASCADE;
            END IF;
        END IF;
    END IF;

    -- 3. Composite Covering Indexes for sub-5ms Multi-Tenant Queries
    CREATE INDEX IF NOT EXISTS idx_users_raw_school_role ON public.users_raw(school_id, role) INCLUDE (id, first_name, last_name);
    CREATE INDEX IF NOT EXISTS idx_rooms_school_id ON public.rooms(school_id, id);
    CREATE INDEX IF NOT EXISTS idx_sessions_school_user ON public.sessions(user_id, check_in_time);

END $$;

-- 4. Schema Reload Notification
NOTIFY pgrst, 'reload schema';
