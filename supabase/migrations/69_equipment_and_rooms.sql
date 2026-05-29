-- Migration 69: Equipment and expanded room/user properties
CREATE TABLE IF NOT EXISTS school_equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) DEFAULT 'instrument',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- RLS for school_equipment (allow read/write for now, matching other tables without full RLS enforcement yet)
ALTER TABLE school_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for school_equipment" ON school_equipment FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_students INT DEFAULT 1;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS qm NUMERIC DEFAULT 0;

ALTER TABLE users ADD COLUMN IF NOT EXISTS required_equipment TEXT[] DEFAULT '{}';
