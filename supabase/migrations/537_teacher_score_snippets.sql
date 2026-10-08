-- ==============================================================================
-- 🏛️ Migration 537: Teacher Score Snippets (Notenschnipsel-Bibliothek)
-- ==============================================================================
-- 0,1% Enterprise Goldstandard:
-- Autoritatives Speichern von 1-4 Takt Notenschnipseln (MicroScores) für Lehrkräfte
-- Multi-Tenancy mit strikter school_id-Isolation und RLS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.teacher_score_snippets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.users_raw(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  instrument TEXT NOT NULL DEFAULT 'piano',
  tempo_bpm INTEGER NOT NULL DEFAULT 80 CHECK (tempo_bpm BETWEEN 40 AND 240),
  bars_count INTEGER NOT NULL DEFAULT 2 CHECK (bars_count BETWEEN 1 AND 4),
  display_mode TEXT NOT NULL DEFAULT 'notes' CHECK (display_mode IN ('notes', 'tabs', 'both')),
  category TEXT NOT NULL DEFAULT 'Etüde',
  tags TEXT[] DEFAULT '{}',
  snippet_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_school_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indizes für schnelle Suchabfragen
CREATE INDEX IF NOT EXISTS idx_teacher_score_snippets_school ON public.teacher_score_snippets(school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_score_snippets_teacher ON public.teacher_score_snippets(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_score_snippets_instrument ON public.teacher_score_snippets(instrument);

-- RLS aktivieren (Default Deny)
ALTER TABLE public.teacher_score_snippets ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation: Lehrkräfte dürfen alle Schnipsel der eigenen Schule lesen
CREATE POLICY "teacher_score_snippets_select_policy" ON public.teacher_score_snippets
  FOR SELECT TO authenticated
  USING (
    school_id = (SELECT public.get_current_user_school_id())
  );

-- Nur eigene Schnipsel anlegen
CREATE POLICY "teacher_score_snippets_insert_policy" ON public.teacher_score_snippets
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id = (SELECT public.get_current_user_school_id()) AND
    teacher_id = auth.uid()
  );

-- Nur eigene Schnipsel aktualisieren
CREATE POLICY "teacher_score_snippets_update_policy" ON public.teacher_score_snippets
  FOR UPDATE TO authenticated
  USING (
    school_id = (SELECT public.get_current_user_school_id()) AND
    teacher_id = auth.uid()
  )
  WITH CHECK (
    school_id = (SELECT public.get_current_user_school_id()) AND
    teacher_id = auth.uid()
  );

-- Nur eigene Schnipsel löschen
CREATE POLICY "teacher_score_snippets_delete_policy" ON public.teacher_score_snippets
  FOR DELETE TO authenticated
  USING (
    school_id = (SELECT public.get_current_user_school_id()) AND
    teacher_id = auth.uid()
  );

-- Revisionssicherer Timestamp Trigger
CREATE OR REPLACE FUNCTION public.set_teacher_score_snippets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teacher_score_snippets_updated_at ON public.teacher_score_snippets;
CREATE TRIGGER trg_teacher_score_snippets_updated_at
  BEFORE UPDATE ON public.teacher_score_snippets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_teacher_score_snippets_updated_at();
