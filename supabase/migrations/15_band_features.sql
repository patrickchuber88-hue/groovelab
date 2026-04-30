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
