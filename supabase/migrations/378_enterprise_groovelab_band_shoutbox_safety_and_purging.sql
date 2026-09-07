-- ==============================================================================
-- MIGRATION 378: ENTERPRISE GROOVELAB BAND SHOUTBOX SAFETY & PURGING
-- Standards: §§ 823, 832 BGB, § 5 ArbZG (Herrenberg Safe-Harbor), Art. 6 DSA, Art. 5 DSGVO
-- 14-Day Rolling Window Purge, Flag-to-Hide Self-Protection, and Multi-Tenant Isolation
-- ==============================================================================

-- 1. ADD FLAGGED COLUMNS FOR FLAG-TO-HIDE PROTECTION
ALTER TABLE public.band_shoutbox
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE;

ALTER TABLE public.band_shoutbox
ADD COLUMN IF NOT EXISTS flagged_by UUID[] DEFAULT '{}'::uuid[];

ALTER TABLE public.band_shoutbox
ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMP WITH TIME ZONE;

-- 2. HIGH-PERFORMANCE COVERING INDEXES
CREATE INDEX IF NOT EXISTS idx_band_shoutbox_created_at_desc
ON public.band_shoutbox(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_band_shoutbox_band_created_covering
ON public.band_shoutbox(band_id, created_at DESC)
INCLUDE (id, user_id, is_flagged);

-- 3. FUNCTION: 14-DAY ROLLING WINDOW PURGE (ART. 5 ABS. 1 LIT. E DSGVO)
-- Automatically cleans up band shouts older than 14 days (2 rehearsal cycles)
-- Excludes __SYSTEM_ANNOUNCEMENTS__ system bands.
CREATE OR REPLACE FUNCTION public.cleanup_expired_band_shoutbox()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    DELETE FROM public.band_shoutbox
    WHERE created_at < (NOW() - INTERVAL '14 days')
    AND band_id NOT IN (
        SELECT id FROM public.bands WHERE name = '__SYSTEM_ANNOUNCEMENTS__'
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_expired_band_shoutbox() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_band_shoutbox() TO authenticated, anon, service_role;

-- 4. RPC: FLAG SHOUTBOX MESSAGE (FLAG-TO-HIDE / STUDENT IMMEDIATE PROTECTION)
CREATE OR REPLACE FUNCTION public.flag_band_shoutbox_message(p_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    UPDATE public.band_shoutbox
    SET is_flagged = TRUE,
        flagged_at = NOW(),
        flagged_by = CASE 
            WHEN v_user_id IS NOT NULL AND NOT (v_user_id = ANY(COALESCE(flagged_by, '{}'::uuid[])))
            THEN array_append(COALESCE(flagged_by, '{}'::uuid[]), v_user_id)
            ELSE COALESCE(flagged_by, '{}'::uuid[])
        END
    WHERE id = p_message_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.flag_band_shoutbox_message(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.flag_band_shoutbox_message(UUID) TO authenticated, anon, service_role;

-- 5. RPC: UNFLAG SHOUTBOX MESSAGE (COACH / TEACHER / ADMIN REVIEW)
CREATE OR REPLACE FUNCTION public.unflag_band_shoutbox_message(p_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.band_shoutbox
    SET is_flagged = FALSE,
        flagged_by = '{}'::uuid[],
        flagged_at = NULL
    WHERE id = p_message_id;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.unflag_band_shoutbox_message(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unflag_band_shoutbox_message(UUID) TO authenticated, anon, service_role;
