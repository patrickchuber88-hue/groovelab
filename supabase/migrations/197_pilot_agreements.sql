-- 🛡️ GrooveLab Pilot Onboarding Agreement Migration
-- Creates a table to record unentgeltliche Pilotphase approvals with RLS policies.

CREATE TABLE IF NOT EXISTS public.pilot_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    UNIQUE(school_id, user_id)
);

ALTER TABLE public.pilot_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pilot_agreements_select" ON public.pilot_agreements;
DROP POLICY IF EXISTS "pilot_agreements_insert" ON public.pilot_agreements;

CREATE POLICY "pilot_agreements_select" ON public.pilot_agreements FOR SELECT USING (
    public.check_school_access(school_id)
);

CREATE POLICY "pilot_agreements_insert" ON public.pilot_agreements FOR INSERT WITH CHECK (
    public.check_school_access(school_id)
    OR NOT EXISTS (SELECT 1 FROM public.pilot_agreements WHERE school_id = pilot_agreements.school_id)
);

NOTIFY pgrst, 'reload schema';
