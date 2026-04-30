-- Fix RLS for songs table to allow admins to manage the catalog
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;

-- 1. Allow admins full access (INSERT, UPDATE, DELETE, SELECT)
DROP POLICY IF EXISTS "Admins can manage songs" ON songs;
CREATE POLICY "Admins can manage songs"
ON songs
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- 2. Allow all authenticated users to view songs
DROP POLICY IF EXISTS "Authenticated users can view songs" ON songs;
CREATE POLICY "Authenticated users can view songs"
ON songs
FOR SELECT
TO authenticated
USING (true);
