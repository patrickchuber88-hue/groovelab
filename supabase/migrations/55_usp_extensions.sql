-- Migration: USP 1 & 2 Extensions (Lehrer-Bypass, Capacity Bremse, System Alerts)
ALTER TABLE users ADD COLUMN IF NOT EXISTS ausweis_nummer VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_qr_token VARCHAR(255) UNIQUE;

CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);
