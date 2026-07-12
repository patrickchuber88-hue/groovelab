-- Ensure storage buckets exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('groovelab-assets', 'groovelab-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('campus-assets', 'campus-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to groovelab-assets" ON storage.objects;
CREATE POLICY "Allow public read access to groovelab-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'groovelab-assets');

DROP POLICY IF EXISTS "Allow authenticated inserts to groovelab-assets" ON storage.objects;
CREATE POLICY "Allow authenticated inserts to groovelab-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'groovelab-assets');

DROP POLICY IF EXISTS "Allow authenticated updates to groovelab-assets" ON storage.objects;
CREATE POLICY "Allow authenticated updates to groovelab-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'groovelab-assets');

DROP POLICY IF EXISTS "Allow authenticated deletes from groovelab-assets" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from groovelab-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'groovelab-assets');

-- Policies for campus-assets
DROP POLICY IF EXISTS "Allow public read access to campus-assets" ON storage.objects;
CREATE POLICY "Allow public read access to campus-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'campus-assets');

DROP POLICY IF EXISTS "Allow authenticated inserts to campus-assets" ON storage.objects;
CREATE POLICY "Allow authenticated inserts to campus-assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'campus-assets');

DROP POLICY IF EXISTS "Allow authenticated updates to campus-assets" ON storage.objects;
CREATE POLICY "Allow authenticated updates to campus-assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'campus-assets');

DROP POLICY IF EXISTS "Allow authenticated deletes from campus-assets" ON storage.objects;
CREATE POLICY "Allow authenticated deletes from campus-assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'campus-assets');
