-- Migration 200: Fix Onboarding Token Foreign Key Constraint
-- The table student_onboarding_tokens should link to user account IDs in public.users_raw,
-- not the anonymous scheduling table public.students.

ALTER TABLE public.student_onboarding_tokens 
DROP CONSTRAINT IF EXISTS student_onboarding_tokens_student_id_fkey;

ALTER TABLE public.student_onboarding_tokens 
ADD CONSTRAINT student_onboarding_tokens_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES public.users_raw(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
