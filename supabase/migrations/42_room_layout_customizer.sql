-- 42_room_layout_customizer.sql
-- Add room dimension columns and station coordinates/instruments

-- Add layout dimensions to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_width DOUBLE PRECISION DEFAULT 10.0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS room_height DOUBLE PRECISION DEFAULT 8.0;

-- Add coordinates and instrument fields to stations table
ALTER TABLE stations ADD COLUMN IF NOT EXISTS pos_x DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS pos_y DOUBLE PRECISION DEFAULT NULL;
ALTER TABLE stations ADD COLUMN IF NOT EXISTS instrument VARCHAR(50) DEFAULT NULL;
