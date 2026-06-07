-- Migration 125: Room Bookings via Campus Events + Location fields

-- 1. Add location columns to campus_events
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'none'; -- 'none' | 'intern' | 'extern'
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES rooms(id) ON DELETE SET NULL;
ALTER TABLE campus_events ADD COLUMN IF NOT EXISTS location_extern TEXT;

-- 2. Create room_bookings table
CREATE TABLE IF NOT EXISTS room_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  booked_by UUID REFERENCES users(id) ON DELETE CASCADE,
  campus_event_id UUID REFERENCES campus_events(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS for room_bookings (open for now, matching pattern of other campus tables)
ALTER TABLE room_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "room_bookings_select" ON room_bookings
  FOR SELECT USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = public.get_current_user_id()
    )
  );

CREATE POLICY "room_bookings_insert" ON room_bookings
  FOR INSERT WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = public.get_current_user_id()
    )
    AND booked_by = public.get_current_user_id()
  );

CREATE POLICY "room_bookings_delete" ON room_bookings
  FOR DELETE USING (
    booked_by = public.get_current_user_id()
  );

-- Fallback: if get_current_user_id is not available (kiosk/anon), allow all
-- (matching the pattern used by campus_events)
CREATE POLICY "room_bookings_fallback_all" ON room_bookings
  FOR ALL USING (true) WITH CHECK (true);
