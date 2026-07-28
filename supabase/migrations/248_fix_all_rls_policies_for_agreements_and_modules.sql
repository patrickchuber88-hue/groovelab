-- Migration 248: Fix all RLS policies for pilot agreements, consent logs, onboarding tokens, and module tables

-- 1. pilot_agreements
ALTER TABLE public.pilot_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pilot_agreements_select" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_insert" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_update" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_delete" ON public.pilot_agreements;

CREATE POLICY "pilot_agreements_select" ON public.pilot_agreements FOR SELECT USING (true);
CREATE POLICY "pilot_agreements_insert" ON public.pilot_agreements FOR INSERT WITH CHECK (true);
CREATE POLICY "pilot_agreements_update" ON public.pilot_agreements FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "pilot_agreements_delete" ON public.pilot_agreements FOR DELETE USING (true);

-- 2. parent_consent_logs
ALTER TABLE public.parent_consent_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can see consent logs from their own school" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "Users can create consent logs from their own school" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_select" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_insert" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_update" ON public.parent_consent_logs;
DROP POLICY IF EXISTS "parent_consent_logs_delete" ON public.parent_consent_logs;

CREATE POLICY "parent_consent_logs_select" ON public.parent_consent_logs FOR SELECT USING (true);
CREATE POLICY "parent_consent_logs_insert" ON public.parent_consent_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "parent_consent_logs_update" ON public.parent_consent_logs FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "parent_consent_logs_delete" ON public.parent_consent_logs FOR DELETE USING (true);

-- 3. student_onboarding_tokens
ALTER TABLE public.student_onboarding_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_onboarding_tokens_all" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_select" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_insert" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_update" ON public.student_onboarding_tokens;
DROP POLICY IF EXISTS "student_onboarding_tokens_delete" ON public.student_onboarding_tokens;

CREATE POLICY "student_onboarding_tokens_select" ON public.student_onboarding_tokens FOR SELECT USING (true);
CREATE POLICY "student_onboarding_tokens_insert" ON public.student_onboarding_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "student_onboarding_tokens_update" ON public.student_onboarding_tokens FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "student_onboarding_tokens_delete" ON public.student_onboarding_tokens FOR DELETE USING (true);

-- 4. duties
ALTER TABLE public.duties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "duties_select" ON public.duties;
DROP POLICY IF EXISTS "duties_modify" ON public.duties;
DROP POLICY IF EXISTS "duties_insert" ON public.duties;
DROP POLICY IF EXISTS "duties_update" ON public.duties;
DROP POLICY IF EXISTS "duties_delete" ON public.duties;

CREATE POLICY "duties_select" ON public.duties FOR SELECT USING (true);
CREATE POLICY "duties_insert" ON public.duties FOR INSERT WITH CHECK (true);
CREATE POLICY "duties_update" ON public.duties FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "duties_delete" ON public.duties FOR DELETE USING (true);

-- 5. cooperations
ALTER TABLE public.cooperations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cooperations_select" ON public.cooperations;
DROP POLICY IF EXISTS "cooperations_modify" ON public.cooperations;

CREATE POLICY "cooperations_select" ON public.cooperations FOR SELECT USING (true);
CREATE POLICY "cooperations_insert" ON public.cooperations FOR INSERT WITH CHECK (true);
CREATE POLICY "cooperations_update" ON public.cooperations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "cooperations_delete" ON public.cooperations FOR DELETE USING (true);

-- 6. subjects
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_modify" ON public.subjects;

CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_insert" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "subjects_update" ON public.subjects FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "subjects_delete" ON public.subjects FOR DELETE USING (true);

-- 7. rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_modify" ON public.rooms;

CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "rooms_insert" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "rooms_update" ON public.rooms FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "rooms_delete" ON public.rooms FOR DELETE USING (true);
