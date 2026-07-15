-- Migration: 224_create_band_shoutbox.sql
-- Description: Creates band_shoutbox table on public schema.

CREATE TABLE IF NOT EXISTS public.band_shoutbox (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    band_id UUID REFERENCES public.bands(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_raw(id) ON DELETE CASCADE,
    content TEXT,
    read_by TEXT[] DEFAULT '{}'::text[]
);
ALTER TABLE public.band_shoutbox DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.band_shoutbox TO authenticated, anon, service_role;
