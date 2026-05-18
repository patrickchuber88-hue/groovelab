-- ⏸️ Pause/Deaktivierungs-Schalter für Schulen
-- Führe diesen SQL-Code in deinem Supabase SQL-Editor aus.

-- 1. Spalte "is_paused" in der Tabelle "schools" anlegen (Standardmäßig false)
ALTER TABLE schools ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT false;
