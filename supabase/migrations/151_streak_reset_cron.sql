-- Migration 151: Streak Reset Cron Job
-- Resets the current streak (streak_flame) for students who did not practice yesterday.

CREATE OR REPLACE FUNCTION public.reset_expired_streaks()
RETURNS void AS $$
DECLARE
    today_berlin DATE := (NOW() AT TIME ZONE 'Europe/Berlin')::date;
BEGIN
    -- 1. Reset avatars streak_flame to 0 for students whose last practice date was before yesterday (today_berlin - 1) or is NULL
    UPDATE public.avatars
    SET streak_flame = 0
    FROM public.student_stats
    WHERE public.avatars.user_id = public.student_stats.student_id
      AND (public.student_stats.last_practice_date < today_berlin - 1 OR public.student_stats.last_practice_date IS NULL);

    -- 2. Reset student_stats streak_flame to 0
    UPDATE public.student_stats
    SET streak_flame = 0
    WHERE last_practice_date < today_berlin - 1 OR last_practice_date IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Safe scheduling of the cron job (runs every night at 02:30 UTC, which is 03:30 CET / 04:30 CEST)
DO $$
BEGIN
    PERFORM cron.unschedule('reset-streaks-daily');
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END;
$$;

SELECT cron.schedule('reset-streaks-daily', '30 2 * * *', 'SELECT public.reset_expired_streaks();');
