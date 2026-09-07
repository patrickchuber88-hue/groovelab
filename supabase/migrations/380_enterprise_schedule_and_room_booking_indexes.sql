-- ==============================================================================
-- 🏛️ MIGRATION 380: ENTERPRISE SCHEDULE, ROOM BOOKINGS & AVATAR COVERING INDEXES
-- Standard: OWASP ASVS Level 3 / Sub-5ms Multi-Tenant Query Execution
-- Target Tables: room_bookings, avatars, schedules
-- ==============================================================================

-- 1. ROOM BOOKINGS COVERING INDEXES
-- Optimizes calendar week range scans: .eq('school_id', schoolId).gte('date', start).lte('date', end)
CREATE INDEX IF NOT EXISTS idx_room_bookings_school_date_covering
ON public.room_bookings(school_id, date)
INCLUDE (id, room_id, booked_by, start_time, end_time, title);

-- Optimizes teacher-specific room booking lookups: .eq('booked_by', userId).gte('date', start).lte('date', end)
CREATE INDEX IF NOT EXISTS idx_room_bookings_booked_by_date
ON public.room_bookings(booked_by, date);

-- 2. AVATARS LOOKUP ACCELERATION
-- Eliminates sequential table scans during student avatar joins in teacher briefing & calendar
CREATE INDEX IF NOT EXISTS idx_avatars_user_id_covering
ON public.avatars(user_id)
INCLUDE (avatar_style, evolution_level, xp, streak_flame);

-- 3. SCHEDULES COMPOSITE COVERING INDEX
-- Optimizes teacher schedule projection & collision checks
CREATE INDEX IF NOT EXISTS idx_schedules_teacher_school_covering
ON public.schedules(teacher_id, school_id)
INCLUDE (id, room_id, time_slot, duration, day_of_week, student_id, status);
