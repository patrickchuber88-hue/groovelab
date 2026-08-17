-- GrooveLab Production Schema
-- Generated on 2026-05-11

-- START: 00_init_schema.sql
-- Aktiviere UUID-Erweiterung, falls nicht vorhanden
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
CREATE TYPE help_status AS ENUM ('pending', 'in_progress', 'resolved');

-- TABELLEN

-- 1. Schulen (Mandanten)
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3b82f6',
    gps_lat DECIMAL(10, 8),
    gps_lng DECIMAL(11, 8),
    gps_radius_meters INT DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Benutzer (Schüler, Lehrer, Admins)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    qr_token UUID UNIQUE DEFAULT uuid_generate_v4(),
    instrument VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Räume & Übeplätze (Stations)
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    station_qr_token UUID UNIQUE DEFAULT uuid_generate_v4()
);

-- 4. Check-ins & Präsenz-Tracking
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id),
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    gps_verified BOOLEAN DEFAULT FALSE,
    presence_minutes INT DEFAULT 0
);

-- 5. Übungen & Fortschritt
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT
);

CREATE TABLE user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    current_level INT DEFAULT 1,
    progress_percent INT DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    stage_ready_badge BOOLEAN DEFAULT FALSE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, exercise_id)
);

-- 6. Hilfe-Ruf System
CREATE TABLE help_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
    status help_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- ROW LEVEL SECURITY (RLS) - Basic Setup für den MVP
-- Hier sichern wir ab, dass Daten nur für die jeweilige Schule sichtbar sind.
-- Da wir gerade aufbauen, aktivieren wir RLS später vollumfänglich mit Auth-Tokens.

-- END: 00_init_schema.sql

-- START: 03_stage_ready_wall.sql
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  artist TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_song_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  instrument TEXT NOT NULL,
  progress_percent INTEGER DEFAULT 0,
  is_stage_ready BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed data for School 1
INSERT INTO songs (id, school_id, artist, title) VALUES
('66666666-6666-6666-6666-666666666661', '11111111-1111-1111-1111-111111111111', 'Nirvana', 'Smells Like Teen Spirit'),
('66666666-6666-6666-6666-666666666662', '11111111-1111-1111-1111-111111111111', 'The White Stripes', 'Seven Nation Army')
ON CONFLICT DO NOTHING;

-- Seed data for Alex M. (user '44444444-4444-4444-4444-444444444444', Guitar)
INSERT INTO user_song_skills (user_id, song_id, instrument, progress_percent, is_stage_ready) VALUES
('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666661', 'Guitar', 100, TRUE),
('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666662', 'Guitar', 85, FALSE)
ON CONFLICT DO NOTHING;

-- Seed dummy data to show matching on Wall
-- Dummy Drummer for Teen Spirit
INSERT INTO users (id, school_id, role, first_name, last_name, instrument) VALUES
('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'student', 'Dave', 'G.', 'Drums') ON CONFLICT DO NOTHING;

INSERT INTO user_song_skills (user_id, song_id, instrument, progress_percent, is_stage_ready) VALUES
('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666661', 'Drums', 100, TRUE)
ON CONFLICT DO NOTHING;

-- END: 03_stage_ready_wall.sql

-- START: 05_geofencing.sql
-- Geofencing Schema Update

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;

-- Update the existing "Groovelab Academy" with dummy coordinates (e.g., Munich City Center)
UPDATE schools 
SET latitude = 48.1351, 
    longitude = 11.5820,
    geofence_radius_meters = 150
WHERE id = '11111111-1111-1111-1111-111111111111';

-- END: 05_geofencing.sql

-- START: 06_room_gps.sql
-- Room GPS Schema Update

ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- END: 06_room_gps.sql

-- START: 07_song_library.sql
-- Song Library Schema Update

ALTER TABLE songs 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS media_link TEXT;

-- END: 07_song_library.sql

-- START: 08_disable_rls.sql
-- Disable RLS for MVP Pseudo-Auth

ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE stations DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE help_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_song_skills DISABLE ROW LEVEL SECURITY;

-- END: 08_disable_rls.sql

-- START: 09_bands_instrumentation.sql
-- Phase 12: Bands und dynamische Instrumentierung

-- 1. Instrumentation zu Songs hinzufügen
ALTER TABLE songs ADD COLUMN IF NOT EXISTS instrumentation JSONB DEFAULT '{"Guitar": 1, "Bass": 1, "Drums": 1, "Keys": 0, "Vocals": 0}'::jsonb;

-- 2. Bands Tabelle
CREATE TABLE IF NOT EXISTS bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Band Members Tabelle
CREATE TABLE IF NOT EXISTS band_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    confetti_seen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_id, user_id)
);

-- RLS deaktivieren für MVP
ALTER TABLE bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_members DISABLE ROW LEVEL SECURITY;

-- END: 09_bands_instrumentation.sql

-- START: 10_approval_workflow.sql
-- Phase 13: Asynchroner Approval Workflow

-- Füge is_pending_approval Spalte zu user_song_skills hinzu
ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS is_pending_approval BOOLEAN DEFAULT FALSE;

-- END: 10_approval_workflow.sql

-- START: 11_coach_notes.sql
-- Add coach_notes column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_notes TEXT DEFAULT 'Fokussiere dich heute auf saubere Übergänge. Deine Rhythmik wird immer besser!';

-- END: 11_coach_notes.sql

-- START: 12_user_profile_fields.sql
-- Add profile columns for teachers and students
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bands JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS projects JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS listening TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gear TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS musical_styles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipment_list JSONB DEFAULT '[]'::jsonb;

-- END: 12_user_profile_fields.sql

-- START: 13_user_availability.sql
-- Create user_availability table for the Weekly Planner
CREATE TABLE user_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
    time_slot TEXT NOT NULL, -- e.g., "14:00"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, day_of_week, time_slot)
);

-- Index for performance
CREATE INDEX idx_user_availability_user ON user_availability(user_id);

-- END: 13_user_availability.sql

-- START: 14_band_structure.sql
-- Create bands table
CREATE TABLE IF NOT EXISTS bands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    avatar_url TEXT,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create band_members table
CREATE TABLE IF NOT EXISTS band_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_id, user_id)
);

-- Enable RLS
ALTER TABLE bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_members ENABLE ROW LEVEL SECURITY;

-- Policies for bands
DROP POLICY IF EXISTS "Bands are visible to school members" ON bands;
CREATE POLICY "Bands are visible to school members"
    ON bands FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = bands.school_id
        )
    );

DROP POLICY IF EXISTS "Band members can update their band" ON bands;
CREATE POLICY "Band members can update their band"
    ON bands FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM band_members
            WHERE band_members.band_id = bands.id
            AND band_members.user_id = auth.uid()
        )
    );

-- Policies for band_members
DROP POLICY IF EXISTS "Band members are visible to school members" ON band_members;
CREATE POLICY "Band members are visible to school members"
    ON band_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.school_id = (SELECT school_id FROM bands WHERE id = band_members.band_id)
        )
    );

-- Trigger for auto-friendship on band creation (Conceptual)
-- We'll handle the logic in the application layer for better control and feedback.

-- END: 14_band_structure.sql

-- START: 15_band_features.sql
-- Expansion for Band Profile and Dashboard Features

-- Add bio and banner to bands
ALTER TABLE bands ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE bands ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Create band_gigs table for concert tracking
CREATE TABLE IF NOT EXISTS band_gigs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    venue TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create band_media table for YouTube and audio recordings
CREATE TABLE IF NOT EXISTS band_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('youtube', 'audio')),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create band_song_proposals table for democratic song selection
CREATE TABLE IF NOT EXISTS band_song_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES bands(id) ON DELETE CASCADE,
    proposed_by UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    youtube_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'added_to_library')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create band_proposal_votes for tracking individual member consensus
CREATE TABLE IF NOT EXISTS band_proposal_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    proposal_id UUID REFERENCES band_song_proposals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    vote TEXT CHECK (vote IN ('approve', 'reject')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(proposal_id, user_id)
);

-- Enable RLS
ALTER TABLE band_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE band_proposal_votes ENABLE ROW LEVEL SECURITY;

-- Policies: Visibility for school members, Mutations for band members
-- Gigs
DROP POLICY IF EXISTS "Gigs visible to school" ON band_gigs;
CREATE POLICY "Gigs visible to school" ON band_gigs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Band members manage gigs" ON band_gigs;
CREATE POLICY "Band members manage gigs" ON band_gigs FOR ALL USING (
    EXISTS (SELECT 1 FROM band_members WHERE band_id = band_gigs.band_id AND user_id = auth.uid())
);

-- Media
DROP POLICY IF EXISTS "Media visible to school" ON band_media;
CREATE POLICY "Media visible to school" ON band_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Band members manage media" ON band_media;
CREATE POLICY "Band members manage media" ON band_media FOR ALL USING (
    EXISTS (SELECT 1 FROM band_members WHERE band_id = band_media.band_id AND user_id = auth.uid())
);

-- Song Proposals
DROP POLICY IF EXISTS "Proposals visible to band members" ON band_song_proposals;
CREATE POLICY "Proposals visible to band members" ON band_song_proposals FOR SELECT USING (
    EXISTS (SELECT 1 FROM band_members WHERE band_id = band_song_proposals.band_id AND user_id = auth.uid())
);

DROP POLICY IF EXISTS "Band members manage proposals" ON band_song_proposals;
CREATE POLICY "Band members manage proposals" ON band_song_proposals FOR ALL USING (
    EXISTS (SELECT 1 FROM band_members WHERE band_id = band_song_proposals.band_id AND user_id = auth.uid())
);

-- Votes
DROP POLICY IF EXISTS "Votes visible to band members" ON band_proposal_votes;
CREATE POLICY "Votes visible to band members" ON band_proposal_votes FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM band_song_proposals p 
        JOIN band_members m ON p.band_id = m.band_id 
        WHERE p.id = band_proposal_votes.proposal_id AND m.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Band members vote" ON band_proposal_votes;
CREATE POLICY "Band members vote" ON band_proposal_votes FOR ALL USING (
    EXISTS (
        SELECT 1 FROM band_song_proposals p 
        JOIN band_members m ON p.band_id = m.band_id 
        WHERE p.id = band_proposal_votes.proposal_id AND m.user_id = auth.uid()
    )
);

-- END: 15_band_features.sql

-- START: 275_fix_songs_and_mediathek_rls.sql
-- Fix RLS for songs table to allow teachers, admins, and secretaries to manage the catalog
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.songs TO authenticated;
GRANT ALL ON public.songs TO anon;
GRANT ALL ON public.songs TO service_role;

DROP POLICY IF EXISTS "Admins can manage songs" ON public.songs;
DROP POLICY IF EXISTS "Teachers can manage own songs" ON public.songs;
DROP POLICY IF EXISTS "Teachers see only own songs" ON public.songs;
DROP POLICY IF EXISTS "Authenticated users can view songs" ON public.songs;
DROP POLICY IF EXISTS "Anyone in school can see songs" ON public.songs;
DROP POLICY IF EXISTS "songs_select" ON public.songs;
DROP POLICY IF EXISTS "songs_modify" ON public.songs;
DROP POLICY IF EXISTS "songs_select_public" ON public.songs;
DROP POLICY IF EXISTS "songs_mutation_school" ON public.songs;
DROP POLICY IF EXISTS "songs_all" ON public.songs;

CREATE POLICY "songs_select" ON public.songs
FOR SELECT TO authenticated, anon
USING (
  public.is_master_admin()
  OR public.check_school_access(school_id)
  OR school_id = public.get_user_school_id()
  OR public.get_user_school_id() IS NULL
);

CREATE POLICY "songs_modify" ON public.songs
FOR ALL TO authenticated, anon
USING (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
  OR (school_id = public.get_user_school_id() AND public.is_teacher_or_admin())
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
)
WITH CHECK (
  public.is_master_admin()
  OR (public.check_school_access(school_id) AND public.is_teacher_or_admin())
  OR (school_id = public.get_user_school_id() AND public.is_teacher_or_admin())
  OR teacher_id = public.get_current_user_id()
  OR teacher_id = auth.uid()
);
-- END: 275_fix_songs_and_mediathek_rls.sql

-- START: 18_add_user_last_seen.sql
-- Add last_seen to users table to track online presence for all roles
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users
UPDATE users SET last_seen = NOW() WHERE last_seen IS NULL;

-- END: 18_add_user_last_seen.sql

-- START: 20240426_multi_point_geofence.sql
-- Add multi-point geofencing support to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS geofence_points JSONB DEFAULT '[]'::jsonb;

-- Migration of existing single points to the new array
UPDATE rooms 
SET geofence_points = jsonb_build_array(jsonb_build_object('lat', latitude, 'lng', longitude))
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND (geofence_points IS NULL OR jsonb_array_length(geofence_points) = 0);

-- END: 20240426_multi_point_geofence.sql

-- START: 20240426_teacher_profile_fields.sql
-- Add teacher profile fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS instrument TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bands TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gear TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS projects TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS listening TEXT;

-- END: 20240426_teacher_profile_fields.sql

-- START: 20240426_teacher_qr_tokens.sql
-- Ensure all teachers/admins have a qr_token
UPDATE users 
SET qr_token = encode(gen_random_bytes(16), 'hex')
WHERE (role = 'teacher' OR role = 'admin') AND (qr_token IS NULL OR qr_token = '');

-- END: 20240426_teacher_qr_tokens.sql

-- START: 20240427_highlighted_at.sql
-- Add highlighted_at column to track today's highlights
ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS highlighted_at TIMESTAMP WITH TIME ZONE;

-- END: 20240427_highlighted_at.sql

-- START: 20240427_rejection_history.sql
-- Table to track rejected Stage Ready attempts (Niederlagen)
CREATE TABLE IF NOT EXISTS rejection_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
    rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    comment TEXT
);

-- END: 20240427_rejection_history.sql

-- START: 20240427_station_colors.sql
-- Migration to add a 'color' column to the stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#e5e7eb';

-- END: 20240427_station_colors.sql

-- START: 20240430_last_practiced.sql
-- Add last_practiced_at to track real-time activity in the lab
ALTER TABLE user_song_skills ADD COLUMN IF NOT EXISTS last_practiced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- END: 20240430_last_practiced.sql

-- START: 21_school_opening_hours.sql
-- Add opening hours and custom school name support
ALTER TABLE schools ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
  "monday": {"start": "08:00", "end": "20:00", "active": true},
  "tuesday": {"start": "08:00", "end": "20:00", "active": true},
  "wednesday": {"start": "08:00", "end": "20:00", "active": true},
  "thursday": {"start": "08:00", "end": "20:00", "active": true},
  "friday": {"start": "08:00", "end": "20:00", "active": true},
  "saturday": {"start": "10:00", "end": "16:00", "active": false},
  "sunday": {"start": "10:00", "end": "16:00", "active": false}
}'::jsonb;

-- END: 21_school_opening_hours.sql

-- START: 22_disable_band_rls.sql
-- Disable RLS for Band tables to allow MVP operations
ALTER TABLE bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_gigs DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_media DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_proposals DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_proposal_votes DISABLE ROW LEVEL SECURITY;

-- END: 22_disable_band_rls.sql

-- START: 23_parallel_slot_matching.sql
-- 23: Support for Parallel Slot Matching and Band Naming

-- 1. Create band_songs table if it doesn't exist (Fixes "relation does not exist" error)
CREATE TABLE IF NOT EXISTS public.band_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE,
    song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_id, song_id)
);

-- 2. Add formation_group to user_song_skills to support multi-slot matching
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS formation_group TEXT;

-- 3. Enhance bands table for naming and status
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 4. Ensure RLS is disabled for the MVP (following the project pattern)
ALTER TABLE public.user_song_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.band_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs DISABLE ROW LEVEL SECURITY;

-- END: 23_parallel_slot_matching.sql

-- START: 24_band_profile_fields.sql
-- 24: Band Profile Enhancements

-- 1. Add bio and photo_url to bands table
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Ensure RLS is disabled for these new columns
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;

-- END: 24_band_profile_fields.sql

-- START: 24_lab_planning.sql
-- Create lab_planning table if not exists
CREATE TABLE IF NOT EXISTS lab_planning (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    day TEXT NOT NULL, -- Mo, Di, Mi, ...
    time TEXT NOT NULL, -- 14:00, 15:00, ...
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, day, time)
);

ALTER TABLE lab_planning DISABLE ROW LEVEL SECURITY;

-- END: 24_lab_planning.sql

-- START: 25_band_expansion.sql
-- 25: Band Expansion & Song Proposal System

-- 1. Enhance band_songs table
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'proposal'; -- 'proposal' or 'active'
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS suggested_by UUID REFERENCES public.users(id);
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS difficulty_level TEXT DEFAULT 'original';

-- 2. Create band_song_slots to track specific orchestration per song
CREATE TABLE IF NOT EXISTS public.band_song_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    band_song_id UUID REFERENCES public.band_songs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    instrument TEXT NOT NULL,
    part_number INTEGER DEFAULT 1,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(band_song_id, user_id), -- A user can only take one slot per song
    UNIQUE(band_song_id, instrument, part_number) -- A specific slot can only be taken by one person
);

-- 3. Disable RLS for new table
ALTER TABLE public.band_song_slots DISABLE ROW LEVEL SECURITY;

-- END: 25_band_expansion.sql

-- START: 26_fix_missing_columns.sql
-- Migration 26: Fix missing profile columns in users and bands tables
-- This migration addresses the "Could not find column" errors when saving teacher or band profiles.

-- 1. Add missing expertise, age, and birth_date columns to users table and increase instrument column size
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expertise TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE public.users ALTER COLUMN instrument TYPE TEXT;

-- 2. Ensure other profile columns exist in users table (redundancy check)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bands TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gear TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS listening TEXT;

-- Standardize types
ALTER TABLE public.users ALTER COLUMN bands TYPE TEXT;
ALTER TABLE public.users ALTER COLUMN gear TYPE TEXT;
ALTER TABLE public.users ALTER COLUMN listening TYPE TEXT;

-- 3. Add missing columns to bands table for social links and appointments
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS soundcloud_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS youtube_links JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS appointments JSONB DEFAULT '[]'::jsonb;

-- 4. Disable RLS for these tables to ensure admin/teacher access (as per existing project patterns)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;

-- END: 26_fix_missing_columns.sql

-- START: 27_band_founding_process.sql
-- 27: Band Founding Process
-- This migration adds support for tracking consent and founding details for new bands.

-- 1. Add status and founder flag to band_song_slots
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'joined'; -- 'joined', 'accepted', 'rejected'
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS is_founder BOOLEAN DEFAULT false;

-- 2. Add temporary founding info to band_songs
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS founding_name TEXT;
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS founding_photo_url TEXT;

-- 3. Comment on columns for clarity
COMMENT ON COLUMN public.band_song_slots.status IS 'Status of the member in the potential band: joined (waiting for full group), accepted (ready to found), rejected (slot released)';
COMMENT ON COLUMN public.band_song_slots.is_founder IS 'True if this student opened the formation';

-- END: 27_band_founding_process.sql

-- START: 28_fix_bands_rls_final.sql
-- Migration 28: Final RLS Fix for Bands and related tables
-- This migration ensures that RLS is truly disabled for all band-related tables 
-- to prevent "new row violates row-level security policy" errors during band founding.

ALTER TABLE IF EXISTS public.bands DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_song_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.band_shoutbox DISABLE ROW LEVEL SECURITY;

-- Also grant all permissions to all roles as a fallback
GRANT ALL ON public.bands TO authenticated, anon, service_role;
GRANT ALL ON public.band_members TO authenticated, anon, service_role;
GRANT ALL ON public.band_songs TO authenticated, anon, service_role;
GRANT ALL ON public.band_song_slots TO authenticated, anon, service_role;
GRANT ALL ON public.band_shoutbox TO authenticated, anon, service_role;

-- END: 28_fix_bands_rls_final.sql

-- START: 29_fix_band_members_schema.sql
-- 29: Fix Band Members Schema and Clean Up Empty Bands
-- This migration adds the missing 'role' column and removes corrupted band entries.

-- 1. Add role column to band_members
ALTER TABLE public.band_members ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'member'; -- 'leader', 'member'

-- 2. Clean up corrupted bands (bands with no members often caused by the schema error)
DELETE FROM public.bands 
WHERE id NOT IN (SELECT band_id FROM public.band_members);

-- 3. Ensure RLS is still disabled (just in case)
ALTER TABLE public.band_members DISABLE ROW LEVEL SECURITY;

-- END: 29_fix_band_members_schema.sql

-- START: 30_band_coach_schema.sql
-- Migration 30: Band Coach and Verification Schema
-- This migration adds support for tracking which teacher verified a student's skill 
-- and identifying the primary "Band Coach" based on these verifications.

-- 1. Add verified_by_id to user_song_skills
ALTER TABLE public.user_song_skills ADD COLUMN IF NOT EXISTS verified_by_id UUID REFERENCES public.users(id);

-- 2. Add coach_id and coach_is_manual to bands
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.users(id);
ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS coach_is_manual BOOLEAN DEFAULT FALSE;

-- 3. Ensure RLS is disabled as per project pattern
ALTER TABLE public.user_song_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.bands DISABLE ROW LEVEL SECURITY;

-- END: 30_band_coach_schema.sql

-- START: 30_band_repertoire_planner.sql
-- 30: Band Repertoire Planner Support
-- This migration adds support for exclusive band repertoire proposals and multi-band logic.

-- 1. Add status to band_songs
-- 'active': Song is in official band repertoire
-- 'planned': Song is in the private Repertoire Planner for the band
ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- 2. Add is_exclusive to band_song_slots
-- If true, this slot is only claimable by existing members of the band associated via band_songs
ALTER TABLE public.band_song_slots ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT false;

-- 3. Add pending_repertoire_proposal to users
-- Stores temporary info about a newly approved challenge that could be proposed to a band
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pending_repertoire_proposal JSONB DEFAULT NULL;

-- END: 30_band_repertoire_planner.sql

-- START: 31_exclusive_proposals.sql
-- Migration 31: Exclusive Band Proposals
-- This migration adds a flag to band songs to indicate if the proposal
-- is exclusive to the current band members.

ALTER TABLE public.band_songs ADD COLUMN IF NOT EXISTS is_exclusive BOOLEAN DEFAULT FALSE;

-- Ensure RLS is disabled
ALTER TABLE public.band_songs DISABLE ROW LEVEL SECURITY;

-- END: 31_exclusive_proposals.sql

-- START: 32_allow_multi_role_members.sql
-- Migration to allow students to play multiple instruments in a band and in a song project
-- This is necessary to support the Vocal-Finder functionality where existing members can also join as singers.

-- 1. Remove the unique constraint on band_members (band_id, user_id)
-- We first need to find the name of the constraint if it's not the default one, but in migration 14 it was defined as UNIQUE(band_id, user_id).
-- Usually Postgres names this band_members_band_id_user_id_key.
ALTER TABLE public.band_members DROP CONSTRAINT IF EXISTS band_members_band_id_user_id_key;

-- 2. Remove the unique constraint on band_song_slots (band_song_id, user_id)
-- In migration 25 it was defined as UNIQUE(band_song_id, user_id).
ALTER TABLE public.band_song_slots DROP CONSTRAINT IF EXISTS band_song_slots_band_song_id_user_id_key;

-- Note: We keep the UNIQUE(band_song_id, instrument, part_number) constraint 
-- because a specific slot (e.g. Lead Guitar) should still only be filled by one person.

-- END: 32_allow_multi_role_members.sql

-- START: 33_external_vocalists.sql
-- Migration to support external vocal-only students (placeholder profiles)
-- These students are managed by teachers and don't have their own interactive profiles.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_external_vocalist BOOLEAN DEFAULT false;

-- Index for performance
CREATE INDEX IF NOT EXISTS users_is_external_vocalist_idx ON public.users(is_external_vocalist);

COMMENT ON COLUMN public.users.is_external_vocalist IS 'True if this is a placeholder profile for an external singer managed by the teacher.';

-- END: 33_external_vocalists.sql

-- START: 99_emergency_rls_fix.sql
-- Emergency fix for visibility issues and band matching
ALTER TABLE user_song_skills DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_song_slots DISABLE ROW LEVEL SECURITY;
ALTER TABLE band_shoutbox DISABLE ROW LEVEL SECURITY;

-- Grant all permissions to authenticated users
GRANT ALL ON user_song_skills TO authenticated;
GRANT ALL ON users TO authenticated;
GRANT ALL ON songs TO authenticated;
GRANT ALL ON band_songs TO authenticated;
GRANT ALL ON band_song_slots TO authenticated;
GRANT ALL ON band_shoutbox TO authenticated;

-- Grant to service_role (just in case)
GRANT ALL ON user_song_skills TO service_role;
GRANT ALL ON users TO service_role;
GRANT ALL ON songs TO service_role;
GRANT ALL ON band_songs TO service_role;
GRANT ALL ON band_song_slots TO service_role;
GRANT ALL ON band_shoutbox TO service_role;

-- Grant to anon for testing visibility if needed
GRANT ALL ON user_song_skills TO anon;
GRANT ALL ON users TO anon;
GRANT ALL ON songs TO anon;
GRANT ALL ON band_songs TO anon;
GRANT ALL ON band_song_slots TO anon;
GRANT ALL ON band_shoutbox TO anon;

-- END: 99_emergency_rls_fix.sql


-- START: 52_campus_erp_integration.sql
-- Description: Database schema extension for Campus ERP and Gamification system

-- 1. Extend schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'standard', -- 'standard' (4.99 €) or 'solo' (2.49 €)
ADD COLUMN IF NOT EXISTS has_campus_subscription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_groovelab_subscription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_kombi_discount BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_bypass BOOLEAN DEFAULT FALSE;

-- Trigger to automatically calculate combined (kombi) discount on subscription flags change
CREATE OR REPLACE FUNCTION check_kombi_discount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.has_campus_subscription = TRUE AND NEW.has_groovelab_subscription = TRUE THEN
        NEW.has_kombi_discount := TRUE;
    ELSE
        NEW.has_kombi_discount := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_kombi_discount
BEFORE INSERT OR UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION check_kombi_discount();

-- 2. Extend user_role enum and users table
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'secretary';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_app_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_campus_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_groovelab_active BOOLEAN DEFAULT FALSE;

-- 3. Instruments and Room acoustic compatibility matrix
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    acoustic_noise_level INT DEFAULT 3, -- 1 (silent/headphones) to 5 (very loud)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_instrument_compatibility (
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
    suitability_score INT DEFAULT 5, -- 1 (incompatible) to 5 (perfect fit)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, instrument_id)
);

-- 4. Two-Class Avatar system
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    avatar_style VARCHAR(50) DEFAULT 'Standard_Silhouette', -- 'Standard_Silhouette' or 'Premium_Hero'
    instrument_type VARCHAR(100),
    evolution_level INT DEFAULT 1,
    asset_path TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: Automatically assign default silhouette avatar to non-app users and premium default to app users
CREATE OR REPLACE FUNCTION assign_default_avatar()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.avatars (user_id, avatar_style, instrument_type, evolution_level, asset_path)
    VALUES (
        NEW.id, 
        CASE WHEN NEW.is_app_user = TRUE THEN 'Premium_Hero' ELSE 'Standard_Silhouette' END,
        COALESCE(NEW.instrument, 'Unknown'),
        1,
        CASE WHEN NEW.is_app_user = TRUE THEN '/avatars/premium_default.png' ELSE '/avatars/silhouette_default.png' END
    ) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_assign_default_avatar
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION assign_default_avatar();

-- Disable RLS for MVP local compatibility
ALTER TABLE public.instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_instrument_compatibility DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anonym and authenticated roles
GRANT ALL ON public.instruments TO authenticated, anon, service_role;
GRANT ALL ON public.room_instrument_compatibility TO authenticated, anon, service_role;
GRANT ALL ON public.avatars TO authenticated, anon, service_role;

-- 5. Billing / Subscription View for active users counting metric
CREATE OR REPLACE VIEW public.active_licence_metrics AS
SELECT 
    school_id,
    COUNT(CASE WHEN is_app_user = TRUE AND is_campus_active = TRUE THEN 1 END) as active_campus_users,
    COUNT(CASE WHEN is_app_user = TRUE AND is_groovelab_active = TRUE THEN 1 END) as active_groovelab_users,
    COUNT(CASE WHEN is_app_user = TRUE AND (is_campus_active = TRUE OR is_groovelab_active = TRUE) THEN 1 END) as total_billable_app_users
FROM 
    public.users
GROUP BY 
    school_id;

-- END: 52_campus_erp_integration.sql

-- START: 53_add_teacher_id_to_users.sql
-- Migration to link students to their creating/managing teachers
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for performance when fetching a teacher's students
CREATE INDEX IF NOT EXISTS users_teacher_id_idx ON public.users(teacher_id);

COMMENT ON COLUMN public.users.teacher_id IS 'References the teacher who created and manages this student profile.';
-- END: 53_add_teacher_id_to_users.sql

-- START: 110_add_teacher_id_to_songs.sql
-- Migration: Link songs explicitly to the teacher who created them.
-- REGEL: Jeder Lehrer sieht in der Mediathek nur seine eigenen Songs.
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Index for fast teacher-based lookups
CREATE INDEX IF NOT EXISTS idx_songs_teacher_id ON public.songs(teacher_id);

COMMENT ON COLUMN public.songs.teacher_id IS 'References the teacher who created this song. NULL means it was created by an admin and is school-wide.';
-- END: 110_add_teacher_id_to_songs.sql

-- START: 111_create_lehrwerke_table.sql
-- Migration: Create lehrwerke table linked to schools and teachers with simplified fields.
CREATE TABLE IF NOT EXISTS public.lehrwerke (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  total_pages INTEGER DEFAULT 50,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lehrwerke_school_id ON public.lehrwerke(school_id);
CREATE INDEX IF NOT EXISTS idx_lehrwerke_teacher_id ON public.lehrwerke(teacher_id);

ALTER TABLE public.lehrwerke DISABLE ROW LEVEL SECURITY;
-- END: 111_create_lehrwerke_table.sql

-- START: 276_comprehensive_rls_hardening.sql
-- Comprehensive Platform-Wide RLS & Data-Saving Hardening
CREATE OR REPLACE FUNCTION public.get_current_user_school_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET row_security = off
SET search_path = public, pg_catalog, pg_temp
AS $$
DECLARE
    v_uid uuid;
    v_school_id uuid;
BEGIN
    BEGIN
        v_uid := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_uid := NULL;
    END;

    IF v_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_uid;
        IF v_school_id IS NOT NULL THEN
            RETURN v_school_id;
        END IF;
    END IF;

    v_uid := public.get_current_user_id();
    IF v_uid IS NOT NULL THEN
        SELECT school_id INTO v_school_id FROM public.users_raw WHERE id = v_uid;
        IF v_school_id IS NOT NULL THEN
            RETURN v_school_id;
        END IF;
    END IF;

    RETURN public.get_user_school_id();
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;
-- END: 276_comprehensive_rls_hardening.sql

-- START: 277_dual_metacognition_match_model.sql
ALTER TABLE IF EXISTS user_song_skills
ADD COLUMN IF NOT EXISTS student_rating integer,
ADD COLUMN IF NOT EXISTS is_match_mode_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
ADD COLUMN IF NOT EXISTS last_matched_teacher_percent integer,
ADD COLUMN IF NOT EXISTS last_matched_student_percent integer,
ADD COLUMN IF NOT EXISTS is_match_successful boolean,
ADD COLUMN IF NOT EXISTS student_rating_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS teacher_rating_updated_at timestamptz;

ALTER TABLE IF EXISTS progress_matrix
ADD COLUMN IF NOT EXISTS student_rating integer,
ADD COLUMN IF NOT EXISTS is_match_mode_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
ADD COLUMN IF NOT EXISTS last_matched_teacher_percent integer,
ADD COLUMN IF NOT EXISTS last_matched_student_percent integer,
ADD COLUMN IF NOT EXISTS is_match_successful boolean;
-- END: 277_dual_metacognition_match_model.sql


