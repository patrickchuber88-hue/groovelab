-- Migration 196: Award XP for mastered songs automatically
-- Description: Automatically awards +50 XP to the student's avatar when a song is mastered (progress_percent = 100 or is_stage_ready = true).

CREATE OR REPLACE FUNCTION public.handle_song_mastery_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_avatar_id UUID;
    v_xp_added INTEGER := 50;
    v_old_mastered BOOLEAN;
    v_new_mastered BOOLEAN;
BEGIN
    -- Check if it was already mastered previously
    v_old_mastered := (TG_OP = 'UPDATE') AND (OLD.is_stage_ready = TRUE OR OLD.progress_percent = 100);
    -- Check if it is mastered now
    v_new_mastered := (NEW.is_stage_ready = TRUE OR NEW.progress_percent = 100);

    -- If newly transitioned to mastered status, award XP
    IF v_new_mastered AND NOT COALESCE(v_old_mastered, FALSE) THEN
        -- Add 50 XP to the user's avatar in avatars table
        UPDATE public.avatars
        SET xp = COALESCE(xp, 0) + v_xp_added
        WHERE user_id = NEW.user_id;
        
        -- Also sync in student_stats table
        UPDATE public.student_stats
        SET current_xp = COALESCE(current_xp, 0) + v_xp_added
        WHERE student_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_song_mastery_xp ON public.user_song_skills;
CREATE TRIGGER trigger_song_mastery_xp
AFTER INSERT OR UPDATE OF progress_percent, is_stage_ready
ON public.user_song_skills
FOR EACH ROW
EXECUTE FUNCTION public.handle_song_mastery_xp();
