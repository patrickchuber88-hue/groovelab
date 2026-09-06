-- Migration 362: Ensure flagship school "Musäk Bad Säckingen" has Audio-Tresor (20 GB) explicitly active
-- Matches FinOps Invariants and prevents zero-storage fallbacks for students and teachers.

DO $$
BEGIN
  UPDATE public.schools
  SET storage_addon_gb = 20,
      storage_addon_status = 'active',
      storage_addon_monthly_fee = 3.99
  WHERE (name ILIKE '%Musäk Bad Säckingen%' OR name ILIKE '%Bad Säckingen%')
    AND (storage_addon_gb IS NULL OR storage_addon_gb = 0);
END $$;
