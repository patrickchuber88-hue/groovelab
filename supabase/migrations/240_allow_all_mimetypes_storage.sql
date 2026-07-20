-- Remove MIME type restrictions for campus-assets and groovelab-assets buckets to allow audio/mp4 and other browser-specific formats
UPDATE storage.buckets 
SET allowed_mime_types = NULL 
WHERE id IN ('campus-assets', 'groovelab-assets');
