-- Migration 146: Allow students to modify their own schedule occurrences
-- Erstellt: 2026-06-10

DROP POLICY IF EXISTS schedule_occurrences_student_modify ON public.schedule_occurrences;

CREATE POLICY schedule_occurrences_student_modify ON public.schedule_occurrences
FOR ALL
USING (
  (auth.uid() = student_id)
)
WITH CHECK (
  (auth.uid() = student_id)
);

NOTIFY pgrst, 'reload schema';
