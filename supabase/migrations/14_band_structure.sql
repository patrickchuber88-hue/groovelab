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
