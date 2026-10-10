-- Migration: 542_didactic_instrument_loans_and_room_capacity.sql
-- Description: Säule 7 - Reale Raumauslastungsquote & Didaktischer Instrumentenverleih (Zero Synthetic Multiplier, Zero localStorage)
-- Bounded Context: CAM-08 (Campus Facilities & Room Governance) / ADM-14 (Didactic Asset Management)

-- 1. Ensure room capacity and metadata columns on public.rooms
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'weekly_capacity_minutes'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN weekly_capacity_minutes INT DEFAULT 2400;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'floor'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN floor TEXT DEFAULT 'EG';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'unsuitable_instruments'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN unsuitable_instruments TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'room_instruments'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN room_instruments JSONB DEFAULT '[]';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'rooms' AND column_name = 'sonstiges'
    ) THEN
        ALTER TABLE public.rooms ADD COLUMN sonstiges TEXT DEFAULT '';
    END IF;
END $$;

-- 2. Ensure duration columns on public.schedules exist for precise minute calculations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schedules' AND column_name = 'duration'
    ) THEN
        ALTER TABLE public.schedules ADD COLUMN duration INT DEFAULT 45;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'schedules' AND column_name = 'duration_minutes'
    ) THEN
        ALTER TABLE public.schedules ADD COLUMN duration_minutes INT DEFAULT 45;
    END IF;
END $$;

-- 3. Didactic Instrument Loans Table (Instrumentenverleih)
CREATE TABLE IF NOT EXISTS public.instrument_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    teacher_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
    instrument_name TEXT NOT NULL,
    inventory_number TEXT,
    serial_number TEXT,
    loan_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    returned_date DATE,
    condition_notes TEXT,
    deposit_amount NUMERIC(10,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'returned', 'overdue', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on instrument_loans
ALTER TABLE public.instrument_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instrument_loans FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Strict_MultiTenant_Instrument_Loans" ON public.instrument_loans;
CREATE POLICY "Strict_MultiTenant_Instrument_Loans" ON public.instrument_loans
    FOR ALL
    USING (
        school_id = (
            SELECT COALESCE(
                NULLIF(current_setting('app.current_school_id', true), '')::UUID,
                (SELECT school_id FROM public.users WHERE id = auth.uid() LIMIT 1)
            )
        )
    )
    WITH CHECK (
        school_id = (
            SELECT COALESCE(
                NULLIF(current_setting('app.current_school_id', true), '')::UUID,
                (SELECT school_id FROM public.users WHERE id = auth.uid() LIMIT 1)
            )
        )
    );

CREATE INDEX IF NOT EXISTS idx_instrument_loans_school_student 
    ON public.instrument_loans (school_id, student_id, status);

-- 4. Autoritativer Server-RPC: get_school_rooms_occupancy_matrix
-- Mathematisch exakte Raumauslastung ohne synthetische *65 Faktoren oder 15% Minimum-Floor
CREATE OR REPLACE FUNCTION public.get_school_rooms_occupancy_matrix(p_school_id UUID)
RETURNS TABLE (
    room_id UUID,
    room_name TEXT,
    building_id UUID,
    building_name TEXT,
    floor TEXT,
    weekly_capacity_minutes INT,
    booked_minutes INT,
    occupancy_pct NUMERIC,
    active_allocations_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Mandantenschutz: Zugriff nur für Master-Admin oder Angehörige dieser Schule
    IF NOT (current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin() OR public.get_current_user_school_id() = p_school_id) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Mandantenübergreifender Zugriff verweigert.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT 
        r.id AS room_id,
        r.name::TEXT AS room_name,
        r.building_id,
        b.name::TEXT AS building_name,
        COALESCE(NULLIF(r.floor, 'Allgemein'), 'EG')::TEXT AS floor,
        COALESCE(r.weekly_capacity_minutes, 2400)::INT AS weekly_capacity_minutes,
        COALESCE(SUM(COALESCE(s.duration_minutes, s.duration, 45)), 0)::INT AS booked_minutes,
        ROUND(
            LEAST(100.0, 
                (COALESCE(SUM(COALESCE(s.duration_minutes, s.duration, 45)), 0)::NUMERIC / 
                 GREATEST(1, COALESCE(r.weekly_capacity_minutes, 2400))::NUMERIC) * 100.0
            ), 1
        ) AS occupancy_pct,
        COUNT(s.id)::INT AS active_allocations_count
    FROM public.rooms r
    LEFT JOIN public.buildings b ON b.id = r.building_id
    LEFT JOIN public.schedules s ON s.room_id = r.id 
        AND s.school_id = p_school_id 
        AND s.status NOT IN ('rejected', 'canceled_by_student', 'canceled_by_teacher_sick')
    WHERE r.school_id = p_school_id
    GROUP BY r.id, r.name, r.building_id, b.name, r.floor, r.weekly_capacity_minutes
    ORDER BY r.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_school_rooms_occupancy_matrix(UUID) TO authenticated, service_role;
