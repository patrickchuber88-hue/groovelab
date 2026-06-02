-- Migration: 111_create_lehrwerke_table.sql
-- Description: Create lehrwerke table linked to schools and teachers with simplified fields.

CREATE TABLE IF NOT EXISTS public.lehrwerke (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  author TEXT,
  total_pages INTEGER DEFAULT 50,
  school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lehrwerke_school_id ON public.lehrwerke(school_id);
CREATE INDEX IF NOT EXISTS idx_lehrwerke_teacher_id ON public.lehrwerke(teacher_id);

-- Disable Row Level Security (RLS) for Pseudo-Auth integration
ALTER TABLE public.lehrwerke DISABLE ROW LEVEL SECURITY;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
