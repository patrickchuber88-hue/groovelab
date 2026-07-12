-- Migration: 217_lessons_select_policy_and_planning_status
-- Description: Updates lessons SELECT policy to allow admins and secretaries to view lessons, and adds planning_status column to campus_events.

-- Add planning_status column to campus_events if not exists
ALTER TABLE public.campus_events ADD COLUMN IF NOT EXISTS planning_status TEXT DEFAULT 'planung' NOT NULL;

-- Drop check constraint if exists
ALTER TABLE public.campus_events DROP CONSTRAINT IF EXISTS check_planning_status;
ALTER TABLE public.campus_events ADD CONSTRAINT check_planning_status CHECK (planning_status IN ('planung', 'bestaetigt', 'laufend', 'abgeschlossen'));

-- Update lessons select policy
DROP POLICY IF EXISTS lessons_select ON public.lessons;
CREATE POLICY lessons_select ON public.lessons 
FOR SELECT USING (
  (public.get_current_user_role() = 'teacher' AND teacher_id = public.get_current_user_id())
  OR (public.get_current_user_role() = 'student' AND student_id = public.get_current_user_id())
  OR (public.get_current_user_role() IN ('admin', 'secretary'))
);
