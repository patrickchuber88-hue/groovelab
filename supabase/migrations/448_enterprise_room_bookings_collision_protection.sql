-- ============================================================================
-- Migration 448: PostgreSQL Engine-Level Room Collision Shield (Säule 5)
-- Tier-1 Enterprise+ Goldstandard: Physical Space Conflict Prevention
-- ============================================================================
-- 1. Btree_gist Extension für Multi-Column Composite Exclusion Constraints
-- 2. tsrange Slot Generator Trigger (Deterministic UTC/Wall-Clock Range)
-- 3. GiST Exclusion Constraint (school_id = , room_id = , booking_slot &&)
-- 4. Fail-Closed Atomic Booking RPC mit benutzerfreundlicher Kollisionsmeldung
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. Sicherstellen der Spalte booking_slot auf public.room_bookings
ALTER TABLE public.room_bookings 
  ADD COLUMN IF NOT EXISTS booking_slot tsrange;

-- 2. Trigger-Funktion zur synchronen und fehlerfreien Berechnung von booking_slot
CREATE OR REPLACE FUNCTION public.trg_compute_room_booking_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_effective_end TIME;
BEGIN
  -- Multi-Tenancy SSOT Validierung
  IF NEW.school_id IS NULL THEN
    NEW.school_id := public.get_current_user_school_id();
  END IF;

  -- Fallback: Falls end_time fehlt oder <= start_time ist, Standard-Unterrichtseinheit (45 Min)
  IF NEW.end_time IS NULL OR NEW.end_time <= NEW.start_time THEN
    v_effective_end := (NEW.start_time + INTERVAL '45 minutes')::time;
  ELSE
    v_effective_end := NEW.end_time;
  END IF;

  NEW.end_time := v_effective_end;

  -- Berechnung des unumstößlichen tsrange-Fensters (inklusive Start, exklusive Ende: '[)')
  NEW.booking_slot := tsrange(
    (NEW.date + NEW.start_time),
    (NEW.date + v_effective_end),
    '[)'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_room_bookings_slot ON public.room_bookings;
CREATE TRIGGER trg_room_bookings_slot
  BEFORE INSERT OR UPDATE OF date, start_time, end_time, room_id, school_id
  ON public.room_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_compute_room_booking_slot();

-- 3. Bestehende Datensätze migrieren & Slots nachberechnen
UPDATE public.room_bookings
SET booking_slot = tsrange(
  (date + start_time),
  (date + COALESCE(end_time, (start_time + INTERVAL '45 minutes')::time)),
  '[)'
)
WHERE booking_slot IS NULL;

-- 4. Unanfechtbarer GiST-Exclusion Constraint auf Hardware-Ebene
-- Schließt physikalisch aus, dass in derselben Schule derselbe Raum zur selben Zeit doppelt gebucht wird
ALTER TABLE public.room_bookings
  DROP CONSTRAINT IF EXISTS room_bookings_physical_collision_excl;

ALTER TABLE public.room_bookings
  ADD CONSTRAINT room_bookings_physical_collision_excl
  EXCLUDE USING gist (
    school_id WITH =,
    room_id WITH =,
    booking_slot WITH &&
  )
  WHERE (room_id IS NOT NULL AND booking_slot IS NOT NULL);

-- 5. Autoritativer RPC: Atomare Buchung mit benutzerfreundlicher Kollisionsbehandlung
CREATE OR REPLACE FUNCTION public.book_room_atomic(
  p_room_id UUID,
  p_date DATE,
  p_start_time TIME,
  p_end_time TIME DEFAULT NULL,
  p_title TEXT DEFAULT 'Unterricht / Probe'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_school_id UUID;
  v_user_id UUID;
  v_new_id UUID;
BEGIN
  v_school_id := public.get_current_user_school_id();
  v_user_id := public.get_current_user_id();

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Nicht autorisiert: Keine Schul-Identität im Kontext gefunden.'
      USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    INSERT INTO public.room_bookings (
      school_id,
      room_id,
      booked_by,
      date,
      start_time,
      end_time,
      title
    ) VALUES (
      v_school_id,
      p_room_id,
      v_user_id,
      p_date,
      p_start_time,
      p_end_time,
      p_title
    )
    RETURNING id INTO v_new_id;

    RETURN jsonb_build_object(
      'success', true,
      'booking_id', v_new_id,
      'message', 'Raumbuchung erfolgreich bestätigt.'
    );
  EXCEPTION
    WHEN exclusion_violation THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Kollisions-Sperre: Dieser Raum ist zum gewählten Zeitraum bereits belegt.',
        'code', 'ROOM_COLLISION'
      );
  END;
END;
$$;

-- 6. Berechtigungen absichern
GRANT EXECUTE ON FUNCTION public.book_room_atomic(UUID, DATE, TIME, TIME, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_room_atomic(UUID, DATE, TIME, TIME, TEXT) TO anon;

-- Re-assert Force RLS (Defense-in-depth)
ALTER TABLE public.room_bookings FORCE ROW LEVEL SECURITY;
