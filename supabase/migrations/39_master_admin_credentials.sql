-- 🔑 Master Admin Credentials Setup
-- Führe diesen SQL-Code in deinem Supabase SQL-Editor aus.
-- Dieses Skript erweitert das Benutzerschema um Felder für Benutzername und Passwort
-- und stellt sicher, dass ein Master-Admin-Nutzer mit Login-Rechten existiert.

-- 1. Spalten für Master-Admin-Zugangsdaten hinzufügen (falls nicht vorhanden)
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_admin_username TEXT DEFAULT 'admin';
ALTER TABLE users ADD COLUMN IF NOT EXISTS master_admin_password TEXT DEFAULT 'groovelab2026';

-- 2. Aktualisiere bestehende Master-Admins mit Zugangsdaten
UPDATE users 
SET is_master_admin = true,
    master_admin_username = COALESCE(master_admin_username, 'admin'),
    master_admin_password = COALESCE(master_admin_password, 'groovelab2026')
WHERE is_master_admin = true;

-- 3. Standard-Master-Admin (Patrick Huber) anlegen, falls noch kein Master-Admin existiert
-- Er erhält einen festgelegten QR-Token ('7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d') für den Kiosk-Scan.
INSERT INTO users (
  id, 
  first_name, 
  last_name, 
  role, 
  is_master_admin, 
  qr_token, 
  master_admin_username, 
  master_admin_password
)
SELECT 
  '00000000-0000-0000-0000-000000000000',
  'Patrick',
  'Huber',
  'admin',
  true,
  '7b8e1a2c-4d5f-6a7b-8c9d-0e1f2a3b4c5d',
  'admin',
  'groovelab2026'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE is_master_admin = true);
