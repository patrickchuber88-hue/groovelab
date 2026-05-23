-- 50_add_room_sort_order.sql
-- Add sort_order column to rooms table for drag and drop priority ordering

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0;

-- Populate existing rooms with a sequential index per school so we don't break existing data
WITH ordered_rooms AS (
  SELECT id, row_number() OVER (PARTITION BY school_id ORDER BY id) - 1 as seq
  FROM rooms
)
UPDATE rooms
SET sort_order = ordered_rooms.seq
FROM ordered_rooms
WHERE rooms.id = ordered_rooms.id;
