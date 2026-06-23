-- Migration 191: Add room_blocked_slots table for weekly recurring room blockout times (Sperrzeiten)
CREATE TABLE IF NOT EXISTS public.room_blocked_slots (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7), -- 1 = Monday, 7 = Sunday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS room_blocked_slots_select ON public.room_blocked_slots;
DROP POLICY IF EXISTS room_blocked_slots_modify ON public.room_blocked_slots;

-- Define RLS policies
CREATE POLICY room_blocked_slots_select ON public.room_blocked_slots
FOR SELECT USING (
    public.check_school_access(school_id)
);

CREATE POLICY room_blocked_slots_modify ON public.room_blocked_slots
FOR ALL USING (
    public.check_school_access(school_id) AND public.is_teacher_or_admin()
);

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
