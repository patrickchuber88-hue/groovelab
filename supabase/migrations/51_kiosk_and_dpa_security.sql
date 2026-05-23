-- 🛡️ GrooveLab Kiosk & DPA Security Migration
-- Adds columns to schools, creates kiosks & dpa_agreements, and enforces strict tenant isolation via Row Level Security (RLS).

-- 1. EXTENSIONS (Ensure uuid-ossp is active)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. SCHOOL TABLE ALTERATIONS
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS represented_by TEXT;

-- 3. CREATE KIOSKS TABLE
CREATE TABLE IF NOT EXISTS public.kiosks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    station_id UUID REFERENCES public.stations(id) ON DELETE CASCADE,
    secret_token UUID UNIQUE DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CREATE DPA AGREEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.dpa_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    dpa_version VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    UNIQUE(school_id, user_id)
);

-- 5. DEFINE RLS HELPER FUNCTIONS

-- Helper: Get kiosk token safely from request headers
CREATE OR REPLACE FUNCTION public.get_kiosk_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_token text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    v_token := v_headers::json->>'x-kiosk-token';
    IF v_token IS NULL OR v_token = '' THEN
        RETURN NULL;
    END IF;
    RETURN v_token::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Helper: Get QR token safely from request headers
CREATE OR REPLACE FUNCTION public.get_qr_token()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_token text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    v_token := v_headers::json->>'x-qr-token';
    IF v_token IS NULL OR v_token = '' THEN
        RETURN NULL;
    END IF;
    RETURN v_token::uuid;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Helper: Get kiosk school_id
CREATE OR REPLACE FUNCTION public.get_kiosk_school_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token uuid;
    v_school_id uuid;
BEGIN
    v_token := public.get_kiosk_token();
    IF v_token IS NULL THEN
        RETURN NULL;
    END IF;
    
    SELECT school_id INTO v_school_id
    FROM public.kiosks
    WHERE secret_token = v_token;
    
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Helper: Get logged-in user school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_school_id uuid;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN NULL;
    END IF;
    
    SELECT school_id INTO v_school_id
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN v_school_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Helper: Check if master admin
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_is_master boolean;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN false;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN false;
    END IF;
    
    SELECT is_master_admin INTO v_is_master
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN COALESCE(v_is_master, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Helper: Check if teacher or admin of a school
CREATE OR REPLACE FUNCTION public.is_teacher_or_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_user_id text;
    v_role public.user_role;
BEGIN
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN false;
    END IF;
    v_user_id := v_headers::json->>'x-user-id';
    IF v_user_id IS NULL OR v_user_id = '' THEN
        RETURN false;
    END IF;
    
    SELECT role INTO v_role
    FROM public.users
    WHERE id = v_user_id::uuid;
    
    RETURN v_role IN ('teacher', 'admin');
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Helper: Check school access (Core tenant separation check)
CREATE OR REPLACE FUNCTION public.check_school_access(target_school_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_kiosk_school uuid;
    v_user_school uuid;
BEGIN
    -- Master admin bypass
    IF public.is_master_admin() THEN
        RETURN true;
    END IF;

    v_kiosk_school := public.get_kiosk_school_id();
    v_user_school := public.get_user_school_id();

    -- If both are present, both must match the school
    IF v_kiosk_school IS NOT NULL AND v_user_school IS NOT NULL THEN
        RETURN v_kiosk_school = target_school_id AND v_user_school = target_school_id;
    END IF;

    -- If only kiosk is present
    IF v_kiosk_school IS NOT NULL THEN
        RETURN v_kiosk_school = target_school_id;
    END IF;

    -- If only user is present
    IF v_user_school IS NOT NULL THEN
        RETURN v_user_school = target_school_id;
    END IF;

    RETURN false;
END;
$$;


-- 6. ENABLE ROW LEVEL SECURITY ON ALL SCHOOL-RELATED TABLES
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_song_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_song_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_song_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_proposal_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dpa_agreements ENABLE ROW LEVEL SECURITY;


-- 7. DEFINE POLICIES

-- Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Allow select on schools" ON public.schools;
DROP POLICY IF EXISTS "Allow select on users" ON public.users;
DROP POLICY IF EXISTS "Allow insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow update on users" ON public.users;
DROP POLICY IF EXISTS "Allow delete on users" ON public.users;

-- Schools
CREATE POLICY "schools_select" ON public.schools FOR SELECT USING (true); -- Publicly viewable name/colors
CREATE POLICY "schools_modify" ON public.schools FOR ALL USING (public.is_master_admin());
CREATE POLICY "schools_insert" ON public.schools FOR INSERT WITH CHECK (true); -- Allowed for onboarding new schools

-- Users
CREATE POLICY "users_select" ON public.users FOR SELECT USING (
    public.is_master_admin()
    OR (
        public.get_kiosk_token() IS NOT NULL AND
        EXISTS (
            SELECT 1 FROM public.kiosks k
            WHERE k.secret_token = public.get_kiosk_token()
            AND k.school_id = users.school_id
        )
    )
    OR (
        public.get_kiosk_token() IS NULL AND
        public.get_qr_token() IS NOT NULL AND
        qr_token = public.get_qr_token()
    )
    OR public.check_school_access(school_id)
);
CREATE POLICY "users_insert" ON public.users FOR INSERT WITH CHECK (
    public.is_master_admin()
    OR (public.get_user_school_id() = school_id AND public.is_teacher_or_admin())
    -- New school admin during onboarding (when school is empty)
    OR NOT EXISTS (SELECT 1 FROM public.users WHERE school_id = users.school_id)
    -- Coach registering via invite link
    OR (current_setting('request.headers', true)::json->>'x-invite-school-id' = school_id::text)
);
CREATE POLICY "users_update" ON public.users FOR UPDATE USING (
    public.is_master_admin()
    OR (public.check_school_access(school_id) AND (public.is_teacher_or_admin() OR id = (current_setting('request.headers', true)::json->>'x-user-id')::uuid))
);
CREATE POLICY "users_delete" ON public.users FOR DELETE USING (
    public.is_master_admin()
    OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
);

-- Rooms
DROP POLICY IF EXISTS "rooms_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_modify" ON public.rooms;
CREATE POLICY "rooms_select" ON public.rooms FOR SELECT USING (public.check_school_access(school_id));
CREATE POLICY "rooms_modify" ON public.rooms FOR ALL USING (public.check_school_access(school_id) AND public.is_teacher_or_admin());

-- Stations
DROP POLICY IF EXISTS "stations_select" ON public.stations;
DROP POLICY IF EXISTS "stations_modify" ON public.stations;
CREATE POLICY "stations_select" ON public.stations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND public.check_school_access(r.school_id))
);
CREATE POLICY "stations_modify" ON public.stations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND public.check_school_access(r.school_id) AND public.is_teacher_or_admin())
);

-- Sessions
DROP POLICY IF EXISTS "sessions_all" ON public.sessions;
CREATE POLICY "sessions_all" ON public.sessions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND public.check_school_access(u.school_id))
);

-- Exercises
DROP POLICY IF EXISTS "exercises_select" ON public.exercises;
DROP POLICY IF EXISTS "exercises_modify" ON public.exercises;
CREATE POLICY "exercises_select" ON public.exercises FOR SELECT USING (public.check_school_access(school_id));
CREATE POLICY "exercises_modify" ON public.exercises FOR ALL USING (public.check_school_access(school_id) AND public.is_teacher_or_admin());

-- User Progress
DROP POLICY IF EXISTS "user_progress_all" ON public.user_progress;
CREATE POLICY "user_progress_all" ON public.user_progress FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND public.check_school_access(u.school_id))
);

-- Help Requests
DROP POLICY IF EXISTS "help_requests_all" ON public.help_requests;
CREATE POLICY "help_requests_all" ON public.help_requests FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND public.check_school_access(u.school_id))
);

-- Songs
DROP POLICY IF EXISTS "songs_select" ON public.songs;
DROP POLICY IF EXISTS "songs_modify" ON public.songs;
CREATE POLICY "songs_select" ON public.songs FOR SELECT USING (public.check_school_access(school_id));
CREATE POLICY "songs_modify" ON public.songs FOR ALL USING (public.check_school_access(school_id) AND public.is_teacher_or_admin());

-- User Song Skills
DROP POLICY IF EXISTS "user_song_skills_all" ON public.user_song_skills;
CREATE POLICY "user_song_skills_all" ON public.user_song_skills FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND public.check_school_access(u.school_id))
);

-- Bands
DROP POLICY IF EXISTS "bands_select" ON public.bands;
DROP POLICY IF EXISTS "bands_modify" ON public.bands;
CREATE POLICY "bands_select" ON public.bands FOR SELECT USING (public.check_school_access(school_id));
CREATE POLICY "bands_modify" ON public.bands FOR ALL USING (public.check_school_access(school_id));

-- Band Members
DROP POLICY IF EXISTS "band_members_all" ON public.band_members;
CREATE POLICY "band_members_all" ON public.band_members FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bands b WHERE b.id = band_id AND public.check_school_access(b.school_id))
);

-- Band Songs
DROP POLICY IF EXISTS "band_songs_all" ON public.band_songs;
CREATE POLICY "band_songs_all" ON public.band_songs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bands b WHERE b.id = band_id AND public.check_school_access(b.school_id))
);

-- Band Song Slots
DROP POLICY IF EXISTS "band_song_slots_all" ON public.band_song_slots;
CREATE POLICY "band_song_slots_all" ON public.band_song_slots FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.band_songs bs
        JOIN public.bands b ON b.id = bs.band_id
        WHERE bs.id = band_song_id AND public.check_school_access(b.school_id)
    )
);

-- Band Media
DROP POLICY IF EXISTS "band_media_all" ON public.band_media;
CREATE POLICY "band_media_all" ON public.band_media FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bands b WHERE b.id = band_id AND public.check_school_access(b.school_id))
);

-- Band Gigs
DROP POLICY IF EXISTS "band_gigs_all" ON public.band_gigs;
CREATE POLICY "band_gigs_all" ON public.band_gigs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bands b WHERE b.id = band_id AND public.check_school_access(b.school_id))
);

-- Band Song Proposals
DROP POLICY IF EXISTS "band_song_proposals_all" ON public.band_song_proposals;
CREATE POLICY "band_song_proposals_all" ON public.band_song_proposals FOR ALL USING (
    EXISTS (SELECT 1 FROM public.bands b WHERE b.id = band_id AND public.check_school_access(b.school_id))
);

-- Band Proposal Votes
DROP POLICY IF EXISTS "band_proposal_votes_all" ON public.band_proposal_votes;
CREATE POLICY "band_proposal_votes_all" ON public.band_proposal_votes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.band_song_proposals p
        JOIN public.bands b ON b.id = p.band_id
        WHERE p.id = proposal_id AND public.check_school_access(b.school_id)
    )
);

-- Rejection History
DROP POLICY IF EXISTS "rejection_history_all" ON public.rejection_history;
CREATE POLICY "rejection_history_all" ON public.rejection_history FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND public.check_school_access(u.school_id))
);

-- Lab Planning
DROP POLICY IF EXISTS "lab_planning_all" ON public.lab_planning;
CREATE POLICY "lab_planning_all" ON public.lab_planning FOR ALL USING (public.check_school_access(school_id));

-- Kiosks
DROP POLICY IF EXISTS "kiosks_select" ON public.kiosks;
DROP POLICY IF EXISTS "kiosks_modify" ON public.kiosks;
CREATE POLICY "kiosks_select" ON public.kiosks FOR SELECT USING (
    secret_token = public.get_kiosk_token()
    OR public.check_school_access(school_id)
);
CREATE POLICY "kiosks_modify" ON public.kiosks FOR ALL USING (
    public.is_master_admin() 
    OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
);

-- DPA Agreements
DROP POLICY IF EXISTS "dpa_agreements_select" ON public.dpa_agreements;
DROP POLICY IF EXISTS "dpa_agreements_insert" ON public.dpa_agreements;
DROP POLICY IF EXISTS "dpa_agreements_modify" ON public.dpa_agreements;
CREATE POLICY "dpa_agreements_select" ON public.dpa_agreements FOR SELECT USING (public.check_school_access(school_id));
CREATE POLICY "dpa_agreements_insert" ON public.dpa_agreements FOR INSERT WITH CHECK (
    public.check_school_access(school_id)
    OR NOT EXISTS (SELECT 1 FROM public.dpa_agreements WHERE school_id = dpa_agreements.school_id)
);
CREATE POLICY "dpa_agreements_modify" ON public.dpa_agreements FOR ALL USING (public.is_master_admin());


-- 8. FORCE SCHEMA RELOAD
NOTIFY pgrst, 'reload schema';
