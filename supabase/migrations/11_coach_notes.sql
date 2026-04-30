-- Add coach_notes column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS coach_notes TEXT DEFAULT 'Fokussiere dich heute auf saubere Übergänge. Deine Rhythmik wird immer besser!';
