-- ==============================================================================
-- Migration 518: Enterprise Room Booking Teacher Reservation & Rule 2 Dual-Role Isolation
-- Standards: OWASP ASVS Level 3 / Multi-Tenancy / Dual-Role Strict Isolation
--
-- 1. Aktualisiert den autoritativen Trigger enforce_room_booking_secretary_confirmation():
--    - Rule 2 (Dual-Role Strict Isolation): Im Lehrerkontext sind alle Raumbuchungen
--      zwingend unverbindliche Reservierungen "unter Vorbehalt" (status = 'pending', is_confirmed = false).
--    - Auch wenn eine Lehrkraft zugleich Administrations- oder Schulleitungsrechte besitzt
--      (Dual-Role z. B. Peter Pan), darf eine im Lehrerkontext erstellte Raumbuchung niemals
--      automatisch bestätigt werden ("Zero Privilege Leakage").
--    - Nur eine explizite Bestätigung durch das Sekretariat im Schulsekretariat-Dashboard
--      darf den Status auf 'confirmed' / is_confirmed = true setzen.
-- 2. Retroaktive Datenbereinigung:
--    - Setzt die Test-Raumbuchung vom 02.10.2026 (16:30 - 22:00 Uhr) auf
--      status = 'pending' und is_confirmed = false zurück.
-- ==============================================================================

-- 1. Autoritativer Trigger für Raumbuchungs-Governance
CREATE OR REPLACE FUNCTION public.enforce_room_booking_secretary_confirmation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_creator_role TEXT := public.get_current_user_role();
    v_is_admin BOOLEAN := (v_creator_role = 'admin' OR v_creator_role = 'secretary' OR public.is_master_admin());
BEGIN
    -- On INSERT:
    IF TG_OP = 'INSERT' THEN
        -- If status is explicitly pending or unconfirmed, preserve it strictly
        IF NEW.status = 'pending' OR NEW.is_confirmed = FALSE OR NEW.status IS NULL THEN
            NEW.status := 'pending';
            NEW.is_confirmed := FALSE;
        ELSIF NOT v_is_admin THEN
            -- Non-admin/secretary users can never self-confirm
            NEW.status := 'pending';
            NEW.is_confirmed := FALSE;
        ELSE
            -- Admin/secretary context: require both status and boolean flag to match
            IF NEW.status = 'confirmed' AND NEW.is_confirmed IS NOT TRUE THEN
                NEW.is_confirmed := TRUE;
            ELSIF NEW.status <> 'confirmed' THEN
                NEW.status := 'pending';
                NEW.is_confirmed := FALSE;
            END IF;
        END IF;
    END IF;

    -- On UPDATE: Only admin/secretary or master admin can confirm a booking
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.status = 'confirmed' OR NEW.is_confirmed = TRUE) AND (OLD.status <> 'confirmed' OR OLD.is_confirmed = FALSE) THEN
            IF NOT v_is_admin THEN
                RAISE EXCEPTION 'Only secretariat or administration can confirm room bookings.'
                    USING ERRCODE = '42501';
            END IF;
            -- Ensure lockstep consistency
            NEW.status := 'confirmed';
            NEW.is_confirmed := TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Trigger neu anlegen
DROP TRIGGER IF EXISTS trg_enforce_room_booking_confirmation ON public.room_bookings;
CREATE TRIGGER trg_enforce_room_booking_confirmation
BEFORE INSERT OR UPDATE ON public.room_bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_room_booking_secretary_confirmation();

-- 2. Retroaktive Sanierung: Testbuchung vom 02.10.2026 (16:30 - 22:00) auf status = 'pending' zurücksetzen
UPDATE public.room_bookings
SET 
    status = 'pending',
    is_confirmed = FALSE
WHERE date = '2026-10-02'
  AND start_time >= '16:00:00'
  AND start_time <= '17:00:00';

-- 3. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
