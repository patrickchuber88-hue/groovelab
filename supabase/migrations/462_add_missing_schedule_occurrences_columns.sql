-- Migration 462: Add missing schedule_occurrences columns and reload PostgREST schema cache
-- Fixes schema-drift where template_room_id and room_override_id caused bulk insert failures (PGRST204)

ALTER TABLE public.schedule_occurrences
  ADD COLUMN IF NOT EXISTS template_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_override_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS substitute_teacher_id UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_substitute BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS substitute_notes TEXT;

-- High performance lookup indexes
CREATE INDEX IF NOT EXISTS idx_sched_occ_template_room 
  ON public.schedule_occurrences(template_room_id);

CREATE INDEX IF NOT EXISTS idx_sched_occ_room_override 
  ON public.schedule_occurrences(room_override_id);

CREATE INDEX IF NOT EXISTS idx_sched_occ_substitute 
  ON public.schedule_occurrences(substitute_teacher_id, date);

-- Reload PostgREST schema cache to ensure columns are recognized immediately
NOTIFY pgrst, 'reload schema';
