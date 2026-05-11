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
