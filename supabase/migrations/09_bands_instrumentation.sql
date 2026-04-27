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
