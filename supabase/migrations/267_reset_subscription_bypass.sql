-- Migration 267: Reset Subscription Bypass to False and Ensure Active Status
-- Resets subscription_bypass to false for registered music schools (e.g. Musäk Bad Säckingen)
-- to enforce active billing calculation and prevent stale bypass persistence.

ALTER TABLE public.schools 
ALTER COLUMN subscription_bypass SET DEFAULT FALSE;

UPDATE public.schools
SET subscription_bypass = FALSE,
    status = CASE WHEN status = 'bypass' THEN 'active' ELSE status END
WHERE subscription_bypass = TRUE OR status = 'bypass';

COMMENT ON COLUMN public.schools.subscription_bypass IS 'Flags whether the school has a subscription bypass (0,00 EUR sponsoring). Default FALSE.';
