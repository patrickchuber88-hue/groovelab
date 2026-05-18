-- 🔑 Entkopplung des Master-Admins von Patrick Huber (Korrigierte UUID & Eindeutige QR-Token Version)
-- Führe diesen SQL-Code in deinem Supabase SQL-Editor aus.
-- Dadurch wird Patrick Huber wieder ein ganz normaler Lehrer/Admin seiner Musikschule (Musäk Bad Säckingen)
-- und behält seinen funktionierenden QR-Token ('7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d').
-- Es wird ein eigenständiger, dedizierter "Master-Admin" mit einem nagelneuen, einzigartigen QR-Token angelegt.

-- 1. Spalten für Master-Admin-Zugangsdaten hinzufügen (falls noch nicht geschehen)
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_admin_username TEXT DEFAULT 'admin';
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_admin_password TEXT DEFAULT 'groovelab2026';

-- 2. Alle existierenden Nutzer als Master-Admin deaktivieren (inklusive Patrick Huber)
-- Patrick Huber (ID: '55555555-5555-5555-5555-555555555555') behält seine normale Lehrer-Rolle für Bad Säckingen.
UPDATE users 
SET is_master_admin = false;

-- 3. Eigenständigen, dedizierten Master-Admin-Nutzer anlegen/aktualisieren
-- Dieser User erhält einen brandneuen, einzigartigen QR-Token ('fa9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d'), um Konflikte zu vermeiden.
INSERT INTO users (
  id, 
  first_name, 
  last_name, 
  role, 
  is_master_admin, 
  qr_token, 
  master_admin_username, 
  master_admin_password,
  school_id
) VALUES (
  '88888888-8888-8888-8888-888888888888',
  'Master',
  'Admin',
  'admin',
  true,
  'fa9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', -- Einzigartiger UUID-Token für den Master-Admin
  'admin',
  'groovelab2026',
  NULL -- Keine Zuweisung zu einer Schule
)
ON CONFLICT (id) DO UPDATE SET
  is_master_admin = true,
  master_admin_username = COALESCE(users.master_admin_username, 'admin'),
  master_admin_password = COALESCE(users.master_admin_password, 'groovelab2026'),
  school_id = NULL;
