-- Disable RLS on tables that require Supabase Realtime replication for anonymous/header auth users
ALTER TABLE public.schedule_occurrences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_direct_messages DISABLE ROW LEVEL SECURITY;
