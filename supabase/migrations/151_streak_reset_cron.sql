-- Migration 151: Streak Reset Cron Job
-- Resets the current streak (streak_flame) for students who did not practice yesterday.

CREATE OR REPLACE FUNCTION public.reset_expired_streaks()
RETURNS void AS $$
DECLARE
    r RECORD;
    today_berlin DATE := (NOW() AT TIME ZONE 'Europe/Berlin')::date;
    temp_date DATE;
    missed_date DATE;
    diff_days INT;
    current_decayed_streak INT;
    last_joker_week TEXT;
    week_of_missed TEXT;
    latest_joker_date TIMESTAMP WITH TIME ZONE;
    streak_changed BOOLEAN;
    joker_changed BOOLEAN;
BEGIN
    FOR r IN 
        SELECT u.id, u.created_at, u.joker_used_at, a.streak_flame, a.last_focus_date, a.id as avatar_id
        FROM public.users u
        JOIN public.avatars a ON u.id = a.user_id
        WHERE a.streak_flame > 0
    LOOP
        -- Calculate last secured date
        temp_date := COALESCE(r.last_focus_date, r.created_at::date);
        IF r.joker_used_at IS NOT NULL AND (r.joker_used_at::date) > temp_date THEN
            temp_date := r.joker_used_at::date;
        END IF;
        
        diff_days := today_berlin - temp_date;
        
        IF diff_days > 1 THEN
            current_decayed_streak := r.streak_flame;
            
            -- Get ISO week of the last joker
            IF r.joker_used_at IS NOT NULL THEN
                last_joker_week := to_char(r.joker_used_at, 'IYYY-IW');
            ELSE
                last_joker_week := NULL;
            END IF;
            
            latest_joker_date := NULL;
            streak_changed := FALSE;
            joker_changed := FALSE;
            
            -- Loop through missed days
            FOR i IN 1..(diff_days - 1) LOOP
                missed_date := temp_date + i;
                week_of_missed := to_char(missed_date, 'IYYY-IW');
                
                IF last_joker_week IS NULL OR week_of_missed > last_joker_week THEN
                    last_joker_week := week_of_missed;
                    latest_joker_date := (missed_date + time '12:00:00') AT TIME ZONE 'Europe/Berlin';
                    joker_changed := TRUE;
                ELSE
                    IF current_decayed_streak > 0 THEN
                        current_decayed_streak := current_decayed_streak - 1;
                        streak_changed := TRUE;
                    END IF;
                END IF;
            END LOOP;
            
            -- Save changes if any
            IF streak_changed THEN
                UPDATE public.avatars SET streak_flame = current_decayed_streak WHERE id = r.avatar_id;
                UPDATE public.student_stats SET streak_flame = current_decayed_streak WHERE student_id = r.id;
            END IF;
            
            IF joker_changed AND latest_joker_date IS NOT NULL THEN
                UPDATE public.users SET joker_used_at = latest_joker_date WHERE id = r.id;
            END IF;
        END IF;
    END LOOP;
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
