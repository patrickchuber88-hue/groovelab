-- Migration 62: Sick Leave and Crisis Notification Cascade

-- 1. Update schedules check constraint to include 'canceled_by_teacher_sick'
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check CHECK (status IN ('draft', 'ready_for_admin_review', 'approved', 'canceled_by_student', 'pending_parent_approval', 'teacher_sick', 'canceled_by_teacher_sick'));

-- 2. Create notification status type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('UNREAD', 'READ');
    END IF;
END $$;

-- 3. Create crisis_notifications table
CREATE TABLE IF NOT EXISTS public.crisis_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    slot_start_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    status notification_status DEFAULT 'UNREAD',
    notified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Disable RLS for operations
ALTER TABLE public.crisis_notifications DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.crisis_notifications TO authenticated, anon, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
