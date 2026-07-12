-- Migration 212: Campus Feed & Widget-System
-- Fügt neue Felder zu campus_announcements hinzu und erstellt class_feed_posts sowie feed_interactions.

-- 1. campus_announcements erweitern
ALTER TABLE public.campus_announcements 
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general' CHECK (category IN ('announcement', 'event', 'holidays', 'general')),
  ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 2. class_feed_posts erstellen
CREATE TABLE IF NOT EXISTS public.class_feed_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
  group_id UUID, -- Kann optional mit Gruppen/Klassen verknüpft sein
  student_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE, -- Optional für Einzelschüler-Adressierung
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('announcement', 'poll', 'quiz', 'homework')),
  quiz_data JSONB, -- Speichert Quizzes/Umfragen: { questions: [...], options: [...] }
  attachment_url TEXT, -- Für hochgeladene PDFs/Bilder
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. feed_interactions erstellen
CREATE TABLE IF NOT EXISTS public.feed_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_type TEXT NOT NULL CHECK (post_type IN ('campus', 'class')),
  post_id UUID NOT NULL,
  user_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('read', 'like', 'poll_vote', 'quiz_answer')),
  selected_option INTEGER,
  is_correct BOOLEAN,
  emoji_unicode TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS deaktivieren wie im Projekt-Pattern (oder explizit anpassen)
ALTER TABLE public.class_feed_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feed_interactions DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.class_feed_posts TO authenticated, anon, service_role;
GRANT ALL ON public.feed_interactions TO authenticated, anon, service_role;

CREATE INDEX IF NOT EXISTS class_feed_posts_teacher_idx ON public.class_feed_posts(teacher_id);
CREATE INDEX IF NOT EXISTS feed_interactions_post_idx ON public.feed_interactions(post_id);
