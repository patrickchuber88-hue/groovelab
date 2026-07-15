-- Migration: 223_add_genre_to_bands.sql
-- Description: Adds genre column to bands table to fix client-side query 400 Bad Request error.

ALTER TABLE public.bands ADD COLUMN IF NOT EXISTS genre TEXT;
