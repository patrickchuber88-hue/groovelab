-- 114_missions_and_level_gamification.sql
-- Migration to support customizable levels, student roadmap progress, and PIN-secured uploads

CREATE TABLE public.mission_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT 'Standard-Schuljahr',
  level_1_config JSONB NOT NULL DEFAULT '{"songs_required": 1}',
  level_2_config JSONB NOT NULL DEFAULT '{"streak_required": 7, "focus_minutes_required": 15}',
  level_3_config JSONB NOT NULL DEFAULT '{"songs_required": 3}',
  level_4_config JSONB NOT NULL DEFAULT '{"songs_required": 5}',
  level_5_config JSONB NOT NULL DEFAULT '{"songs_required": 8}',
  level_6_config JSONB NOT NULL DEFAULT '{"songs_required": 12}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.student_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  template_id UUID REFERENCES public.mission_templates(id) ON DELETE SET NULL,
  current_level INTEGER NOT NULL DEFAULT 1,
  unlocked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.one_time_upload_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  pin_code VARCHAR(8) NOT NULL,
  is_used BOOLEAN NOT NULL DEFAULT false,
  unlocked_level INTEGER NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn off RLS for simplicity as done for other tables, or enable basic access
ALTER TABLE public.mission_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_missions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.one_time_upload_pins DISABLE ROW LEVEL SECURITY;

-- Seed default template for all existing schools
INSERT INTO public.mission_templates (school_id, title, level_1_config, level_2_config, level_3_config, level_4_config, level_5_config, level_6_config, is_default)
SELECT id, 'Standard-Schuljahr', '{"songs_required": 1}', '{"streak_required": 7, "focus_minutes_required": 15}', '{"songs_required": 3}', '{"songs_required": 5}', '{"songs_required": 8}', '{"songs_required": 12}', true
FROM public.schools;
