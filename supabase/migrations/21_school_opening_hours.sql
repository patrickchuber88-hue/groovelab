-- Add opening hours and custom school name support
ALTER TABLE schools ADD COLUMN IF NOT EXISTS opening_hours JSONB DEFAULT '{
  "monday": {"start": "08:00", "end": "20:00", "active": true},
  "tuesday": {"start": "08:00", "end": "20:00", "active": true},
  "wednesday": {"start": "08:00", "end": "20:00", "active": true},
  "thursday": {"start": "08:00", "end": "20:00", "active": true},
  "friday": {"start": "08:00", "end": "20:00", "active": true},
  "saturday": {"start": "10:00", "end": "16:00", "active": false},
  "sunday": {"start": "10:00", "end": "16:00", "active": false}
}'::jsonb;
