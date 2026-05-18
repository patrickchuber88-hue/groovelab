-- 🛡️ Master Admin RLS Permissions & Policies
-- Führe diesen SQL-Code in deinem Supabase SQL-Editor aus, um dem Master-Admin
-- alle Lese- und Schreibrechte für Schulen sowie weltweite Statistik-Zugriffe zu erteilen.

-- 1. SICHERER HELPER: Prüft ob der aktuelle User ein Master-Admin ist
-- SECURITY DEFINER stellt sicher, dass die Abfrage auf der Tabelle "users" 
-- die RLS-Regeln dieser Tabelle umgeht und somit Endlos-Rekursionen absolut vermeidet.
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND is_master_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. SCHULEN-BERECHTIGUNGEN (schools)
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- Jeder (auch unregistrierte Besucher) muss Schulen sehen können (z.B. für Login/Registrierung)
DROP POLICY IF EXISTS "Schools are visible to everyone" ON schools;
CREATE POLICY "Schools are visible to everyone" 
ON schools FOR SELECT 
USING (true);

-- Nur Master-Admins dürfen Schulen anlegen, bearbeiten oder löschen
DROP POLICY IF EXISTS "Master admins can manage schools" ON schools;
CREATE POLICY "Master admins can manage schools" 
ON schools FOR ALL 
TO authenticated
USING (public.is_master_admin())
WITH CHECK (public.is_master_admin());

-- 3. PROFIL-BERECHTIGUNGEN (users)
-- Master-Admins dürfen alle Profile sehen, um Statistiken (z.B. Lehrer- und Schüler-Zähler) zu berechnen
DROP POLICY IF EXISTS "Master admins can see all profiles" ON users;
CREATE POLICY "Master admins can see all profiles" 
ON users FOR SELECT 
TO authenticated
USING (public.is_master_admin());

-- 4. SITZUNGS-BERECHTIGUNGEN (sessions)
-- Master-Admins dürfen alle aktiven Check-In-Sitzungen sehen, um Auslastungen anzuzeigen
DROP POLICY IF EXISTS "Master admins can see all sessions" ON sessions;
CREATE POLICY "Master admins can see all sessions" 
ON sessions FOR SELECT 
TO authenticated
USING (public.is_master_admin());
