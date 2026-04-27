-- Add multi-point geofencing support to rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS geofence_points JSONB DEFAULT '[]'::jsonb;

-- Migration of existing single points to the new array
UPDATE rooms 
SET geofence_points = jsonb_build_array(jsonb_build_object('lat', latitude, 'lng', longitude))
WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND (geofence_points IS NULL OR jsonb_array_length(geofence_points) = 0);
