-- Migration 373: Enterprise Monolith Performance & Covering Indexes
-- Resolves unfiltered table scans and accelerates dashboard queries across Admin, Teacher, and Secretary modules.

-- 1. Direct Multi-Tenant Scoping for activation_days
ALTER TABLE public.activation_days 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Backfill school_id from users_raw
UPDATE public.activation_days ad
SET school_id = u.school_id
FROM public.users_raw u
WHERE u.id = ad.student_id
  AND ad.school_id IS NULL;

-- Trigger to maintain school_id on activation_days
CREATE OR REPLACE FUNCTION public.trg_fn_set_activation_days_school_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.school_id IS NULL AND NEW.student_id IS NOT NULL THEN
        SELECT school_id INTO NEW.school_id FROM public.users_raw WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_activation_days_school_id ON public.activation_days;
CREATE TRIGGER trg_set_activation_days_school_id
BEFORE INSERT ON public.activation_days
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_activation_days_school_id();

-- Indexes for activation_days
CREATE INDEX IF NOT EXISTS idx_activation_days_school_id ON public.activation_days(school_id);
CREATE INDEX IF NOT EXISTS idx_activation_days_student_id ON public.activation_days(student_id);

-- Update RLS for activation_days with high-speed O(1) indexed check
DROP POLICY IF EXISTS "activation_days_all_policy" ON public.activation_days;
CREATE POLICY "activation_days_all_policy" ON public.activation_days
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR (school_id IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = activation_days.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR (school_id IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = activation_days.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);


-- 2. Direct Multi-Tenant Scoping for student_schedule_preferences
ALTER TABLE public.student_schedule_preferences 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

-- Backfill school_id from users_raw
UPDATE public.student_schedule_preferences ssp
SET school_id = u.school_id
FROM public.users_raw u
WHERE u.id = ssp.student_id
  AND ssp.school_id IS NULL;

-- Trigger to maintain school_id on student_schedule_preferences
CREATE OR REPLACE FUNCTION public.trg_fn_set_student_schedule_preferences_school_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.school_id IS NULL AND NEW.student_id IS NOT NULL THEN
        SELECT school_id INTO NEW.school_id FROM public.users_raw WHERE id = NEW.student_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_student_schedule_preferences_school_id ON public.student_schedule_preferences;
CREATE TRIGGER trg_set_student_schedule_preferences_school_id
BEFORE INSERT ON public.student_schedule_preferences
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_student_schedule_preferences_school_id();

-- Indexes for student_schedule_preferences
CREATE INDEX IF NOT EXISTS idx_student_schedule_preferences_school_id ON public.student_schedule_preferences(school_id);
CREATE INDEX IF NOT EXISTS idx_student_schedule_preferences_student_id ON public.student_schedule_preferences(student_id);

-- Update RLS for student_schedule_preferences with high-speed O(1) indexed check
DROP POLICY IF EXISTS "student_schedule_preferences_all_policy" ON public.student_schedule_preferences;
CREATE POLICY "student_schedule_preferences_all_policy" ON public.student_schedule_preferences
FOR ALL TO authenticated, anon
USING (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR (school_id IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_schedule_preferences.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
)
WITH CHECK (
    public.is_master_admin() 
    OR student_id = public.get_current_authenticated_user_id()
    OR (school_id IS NOT NULL AND school_id = public.get_current_user_school_id())
    OR EXISTS (
        SELECT 1 FROM public.users_raw u 
        WHERE u.id = student_schedule_preferences.student_id 
        AND u.school_id = public.get_current_user_school_id()
    )
);


-- 3. High-Speed Covering Indexes for Monolith Dashboards
CREATE INDEX IF NOT EXISTS idx_bands_school_id_status 
ON public.bands(school_id, status);

CREATE INDEX IF NOT EXISTS idx_bands_school_id_name 
ON public.bands(school_id, name);

CREATE INDEX IF NOT EXISTS idx_schedules_school_teacher_status 
ON public.schedules(school_id, teacher_id, status);

CREATE INDEX IF NOT EXISTS idx_schedules_school_student_status 
ON public.schedules(school_id, student_id, status);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
