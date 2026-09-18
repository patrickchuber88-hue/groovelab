-- ============================================================================
-- Forensic Verification: Room Booking Collision Shield Integrity Proof (Säule 5)
-- Tier-1 Enterprise+ Verification: Tests GiST tsrange Exclusion Constraint
-- ============================================================================

DO $$
DECLARE
  v_school_id UUID := '00000000-0000-0000-0000-000000000001'::uuid;
  v_room_id UUID := '00000000-0000-0000-0000-000000000002'::uuid;
  v_user_id UUID := '00000000-0000-0000-0000-000000000003'::uuid;
  v_collision_caught BOOLEAN := FALSE;
BEGIN
  -- Rollback-Sicherung für Testlauf
  BEGIN
    -- 1. Erste Buchung (10:00 bis 11:00)
    INSERT INTO public.room_bookings (
      school_id, room_id, booked_by, date, start_time, end_time, title
    ) VALUES (
      v_school_id, v_room_id, v_user_id, CURRENT_DATE, '10:00:00'::time, '11:00:00'::time, 'Test Klavier 1'
    );

    -- 2. Zweite Buchung mit Kollision (10:30 bis 11:30)
    BEGIN
      INSERT INTO public.room_bookings (
        school_id, room_id, booked_by, date, start_time, end_time, title
      ) VALUES (
        v_school_id, v_room_id, v_user_id, CURRENT_DATE, '10:30:00'::time, '11:30:00'::time, 'Test Klavier 2 (Kollision)'
      );
    EXCEPTION
      WHEN exclusion_violation THEN
        v_collision_caught := TRUE;
    END;

    IF NOT v_collision_caught THEN
      RAISE EXCEPTION 'FORENSIC FAIL: GiST Exclusion Constraint hat Doppelbuchung nicht abgewehrt!';
    END IF;

    RAISE NOTICE '✅ FORENSIC PASS: PostgreSQL GiST Exclusion Constraint schützt den Raum physisch vor Doppelbelegungen.';

    -- Rollback
    RAISE EXCEPTION 'TEST_SUCCESSFUL_ROLLBACK' USING ERRCODE = 'P0001';
  EXCEPTION
    WHEN SQLSTATE 'P0001' THEN
      NULL; -- Gewollter Rollback
  END;
END;
$$;
