-- Migration 284: Platform Feedback & Community Ideenschmiede / Helden-Moment System
-- Enables structured bug reports, feature ideas with speech-to-text, and public update announcements honoring contributors.

-- 1. Create enum types if not existing
DO $$ BEGIN
    CREATE TYPE feedback_type AS ENUM ('bug', 'feature_idea');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE feedback_status AS ENUM ('inbox', 'triaged', 'in_progress', 'done', 'declined');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE hero_opt_in_type AS ENUM ('full', 'school_only', 'anonymous');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create platform_feedback table
CREATE TABLE IF NOT EXISTS platform_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name TEXT,
    school_name TEXT,
    user_role VARCHAR(32) NOT NULL DEFAULT 'teacher', -- 'admin', 'secretary', 'teacher', 'student'
    active_platform VARCHAR(32) NOT NULL DEFAULT 'campus', -- 'campus', 'groovelab', 'admin_desk'
    
    type feedback_type NOT NULL DEFAULT 'feature_idea',
    board_id VARCHAR(64) NOT NULL, -- e.g. 'schedule', 'homework', 'audio', 'bands', 'admin_billing', 'general'
    board_name VARCHAR(128) NOT NULL,
    smart_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    content TEXT NOT NULL,
    hero_opt_in hero_opt_in_type NOT NULL DEFAULT 'school_only',
    
    -- Client telemetry snapshot
    metadata JSONB DEFAULT '{}'::jsonb,
    
    status feedback_status NOT NULL DEFAULT 'inbox',
    admin_notes TEXT,
    is_announcement_created BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning fast filtering in MasterAdmin
CREATE INDEX IF NOT EXISTS idx_platform_feedback_school_id ON platform_feedback(school_id);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_type ON platform_feedback(type);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_status ON platform_feedback(status);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_board_id ON platform_feedback(board_id);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_created_at ON platform_feedback(created_at DESC);

-- 3. Create platform_announcements table (Helden-Moment Release Updates)
CREATE TABLE IF NOT EXISTS platform_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_feedback_id UUID REFERENCES platform_feedback(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    badge_tag VARCHAR(64) DEFAULT 'NEU', -- e.g. 'NEU', 'UPDATE', 'COMMUNITY'
    hero_credit TEXT, -- e.g. '🏆 Realisiert dank der Idee von Severin Landenberger (Musikschule SoundArt)'
    target_platform VARCHAR(32) NOT NULL DEFAULT 'all', -- 'all', 'campus', 'groovelab'
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_announcements_published ON platform_announcements(is_published, created_at DESC);

-- 4. Enable RLS
ALTER TABLE platform_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for platform_feedback
DROP POLICY IF EXISTS "Users can insert their own feedback" ON platform_feedback;
CREATE POLICY "Users can insert their own feedback" ON platform_feedback
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own feedback" ON platform_feedback;
CREATE POLICY "Users can view their own feedback" ON platform_feedback
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'master_admin'))
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "MasterAdmin has full access to feedback" ON platform_feedback;
CREATE POLICY "MasterAdmin has full access to feedback" ON platform_feedback
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'master_admin'))
        OR auth.jwt() ->> 'role' = 'service_role'
        OR current_user = 'postgres'
    );

-- 6. RLS Policies for platform_announcements
DROP POLICY IF EXISTS "Everyone can read published announcements" ON platform_announcements;
CREATE POLICY "Everyone can read published announcements" ON platform_announcements
    FOR SELECT
    USING (is_published = true);

DROP POLICY IF EXISTS "MasterAdmin has full access to announcements" ON platform_announcements;
CREATE POLICY "MasterAdmin has full access to announcements" ON platform_announcements
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'master_admin'))
        OR auth.jwt() ->> 'role' = 'service_role'
        OR current_user = 'postgres'
    );
