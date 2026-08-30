-- ==============================================================================
-- MIGRATION 306: ENTERPRISE RBAC & ROOM CONFIRMATION ENFORCEMENT
-- Campus-Groovelab Tier-1 SaaS Enterprise+ Strict Tenant & Role Boundaries
-- ==============================================================================

-- 1. ADD is_confirmed COLUMN TO room_bookings IF NOT PRESENT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'room_bookings' AND column_name = 'is_confirmed'
    ) THEN
        ALTER TABLE public.room_bookings ADD COLUMN is_confirmed BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. TRIGGER FUNCTION: ENFORCE MANDATORY SECRETARY CONFIRMATION FOR ROOM BOOKINGS
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
    -- On INSERT: If created in teacher context, status must always be 'pending' and unconfirmed
    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_admin THEN
            NEW.status := 'pending';
            NEW.is_confirmed := FALSE;
        ELSE
            -- Even for admin/secretary, default to confirmed only if explicitly set
            IF NEW.status IS NULL THEN
                NEW.status := 'pending';
            END IF;
            IF NEW.is_confirmed IS NULL THEN
                NEW.is_confirmed := (NEW.status = 'confirmed');
            END IF;
        END IF;
    END IF;

    -- On UPDATE: Only admin/secretary can confirm a booking
    IF TG_OP = 'UPDATE' THEN
        IF (NEW.status = 'confirmed' OR NEW.is_confirmed = TRUE) AND (OLD.status <> 'confirmed' OR OLD.is_confirmed = FALSE) THEN
            IF NOT v_is_admin THEN
                RAISE EXCEPTION 'Only secretariat or administration can confirm room bookings.'
                    USING ERRCODE = '42501';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_room_booking_confirmation ON public.room_bookings;
CREATE TRIGGER trg_enforce_room_booking_confirmation
BEFORE INSERT OR UPDATE ON public.room_bookings
FOR EACH ROW
EXECUTE FUNCTION public.enforce_room_booking_secretary_confirmation();

-- 3. CROSS-TENANT INTEGRITY GUARD FOR SCHEDULES & OCCURRENCES
CREATE OR REPLACE FUNCTION public.enforce_cross_tenant_schedule_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_teacher_school_id UUID;
BEGIN
    IF NEW.teacher_id IS NOT NULL THEN
        SELECT school_id INTO v_teacher_school_id
        FROM public.users_raw
        WHERE id = NEW.teacher_id;

        IF v_teacher_school_id IS NOT NULL AND NEW.school_id IS NOT NULL AND v_teacher_school_id <> NEW.school_id THEN
            RAISE EXCEPTION 'Cross-tenant violation: Teacher belongs to a different school tenant.'
                USING ERRCODE = '42501';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_schedule_tenant_guard ON public.schedules;
CREATE TRIGGER trg_enforce_schedule_tenant_guard
BEFORE INSERT OR UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.enforce_cross_tenant_schedule_guard();

-- Reload schema
NOTIFY pgrst, 'reload schema';
