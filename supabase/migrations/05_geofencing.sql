-- Geofencing Schema Update

ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;

-- Update the existing "Groovelab Academy" with dummy coordinates (e.g., Munich City Center)
UPDATE schools 
SET latitude = 48.1351, 
    longitude = 11.5820,
    geofence_radius_meters = 150
WHERE id = '11111111-1111-1111-1111-111111111111';
