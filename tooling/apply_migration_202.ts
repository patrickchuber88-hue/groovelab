import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODA0MTc4MTUsImV4cCI6NDkzNDAxNzgxNX0.XZd32Y-4LqKhZjiz1l-Ap6TsUk07_SEUA1QN2ot-qys';

const supabase = createClient(
  'https://supabase.campus-groovelab.de',
  SERVICE_KEY
);

async function run() {
  console.log("Applying Migration 202...");
  
  const sql = `
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
                
                -- ONLY apply a joker if current_decayed_streak is greater than 0
                IF current_decayed_streak > 0 AND (last_joker_week IS NULL OR week_of_missed > last_joker_week) THEN
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

UPDATE public.users u
SET joker_used_at = NULL
FROM public.avatars a
WHERE u.id = a.user_id AND a.streak_flame = 0;
  `;

  const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql });
  if (error) {
    console.error("Error executing query:", error);
  } else {
    console.log("Successfully executed Migration 202.");
  }
}
run();
