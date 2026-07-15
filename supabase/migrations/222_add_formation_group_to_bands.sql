-- Migration: 222_add_formation_group_to_bands.sql
-- Description: Adds formation_group column to bands table to fix client-side query 400 Bad Request error.

ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS formation_group TEXT;
