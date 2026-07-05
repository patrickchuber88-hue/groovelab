-- Migration 200: Fix delete_school_cascade by altering sessions_station_id_fkey to ON DELETE SET NULL
ALTER TABLE public.sessions
DROP CONSTRAINT IF EXISTS sessions_station_id_fkey,
ADD CONSTRAINT sessions_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.stations(id) ON DELETE SET NULL;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
