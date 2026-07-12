-- Migration 215: Infos der Verwaltung fields
-- Fügt neue Felder zu campus_feedback_requests hinzu, um To-Dos, Deadlines und Prioritäten zu unterstützen.

ALTER TABLE public.campus_feedback_requests
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'standard' CHECK (priority IN ('standard', 'critical')),
  ADD COLUMN IF NOT EXISTS target_type TEXT DEFAULT 'all' CHECK (target_type IN ('all', 'group', 'individual')),
  ADD COLUMN IF NOT EXISTS target_group TEXT, -- Fachgruppe (z. B. 'guitar', 'piano')
  ADD COLUMN IF NOT EXISTS target_teacher_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT 'none' CHECK (recurrence IN ('none', 'monthly', 'half_yearly')),
  ADD COLUMN IF NOT EXISTS attachment_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by_name TEXT,
  ADD COLUMN IF NOT EXISTS created_by_role TEXT,
  ADD COLUMN IF NOT EXISTS questions TEXT[];
