-- Migration 65: Add pending_reschedule to schedules status constraint
ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS schedules_status_check;
ALTER TABLE public.schedules ADD CONSTRAINT schedules_status_check CHECK (status IN ('draft', 'ready_for_admin_review', 'approved', 'canceled_by_student', 'pending_parent_approval', 'teacher_sick', 'canceled_by_teacher_sick', 'pending_reschedule'));

NOTIFY pgrst, 'reload schema';
