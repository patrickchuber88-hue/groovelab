-- Migration 221: Add Auto Delete Expired Users Setting to Schools Table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS auto_delete_expired_users BOOLEAN DEFAULT FALSE;
