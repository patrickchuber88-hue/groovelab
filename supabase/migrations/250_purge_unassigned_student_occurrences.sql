-- Migration 250: Purge orphaned schedule occurrences for unassigned students (Noah M., Mika C., etc.)

DELETE FROM public.schedule_occurrences
WHERE student_id IN (
  SELECT id FROM public.students WHERE teacher_id IS NULL
  UNION
  SELECT id FROM public.users WHERE role = 'student' AND teacher_id IS NULL
);

DELETE FROM public.schedules
WHERE student_id IN (
  SELECT id FROM public.students WHERE teacher_id IS NULL
  UNION
  SELECT id FROM public.users WHERE role = 'student' AND teacher_id IS NULL
);

NOTIFY pgrst, 'reload schema';
