-- Migration: USP 3 - 80/20 Match-Engine (Instrumenten-Raum-Matrix & Review-Status)

-- 1. allowed_instruments zu rooms hinzufügen (String-Array)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS allowed_instruments TEXT[] DEFAULT '{}';

-- 2. schedules Tabelle erstellen, falls nicht vorhanden
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready_for_admin_review', 'approved')),
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
