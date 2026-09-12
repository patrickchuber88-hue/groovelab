-- ==============================================================================
-- 🏛️ MIGRATION 411: ENTERPRISE TIMETABLE SOURCE & AUDIT PROVENANCE
-- Campus-Groovelab Platform (OWASP ASVS Level 3 / Multi-Tenancy Invariant)
-- ==============================================================================
-- 1. Ergänzt students um timetable_source ('student' | 'teacher')
-- 2. Backfill existierender Schüler mit timetable_assigned_at auf 'student'
-- ==============================================================================

-- 1. Spalte timetable_source hinzufügen falls noch nicht existent
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS timetable_source VARCHAR(20) DEFAULT 'student';

-- 2. Bestehende Datensätze mit Zeitstempel auf 'student' initialisieren
UPDATE public.students
SET timetable_source = 'student'
WHERE timetable_assigned_at IS NOT NULL AND (timetable_source IS NULL OR timetable_source = '');

COMMENT ON COLUMN public.students.timetable_source IS 'Herkunft der Stundenplan-Präferenzen: student (via Onboarding-Link) oder teacher (manuell durch Lehrkraft/Verwaltung)';
