-- Migration 63: GrooveLab Tickets Support Cockpit

-- 1. Create enums for component types and ticket status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'groovelab_component_type') THEN
        CREATE TYPE groovelab_component_type AS ENUM ('HEADPHONES', 'CABLE', 'IPAD', 'OTHER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'groovelab_ticket_status') THEN
        CREATE TYPE groovelab_ticket_status AS ENUM ('OPEN', 'RESOLVED');
    END IF;
END $$;

-- 2. Create groovelab_tickets table
CREATE TABLE IF NOT EXISTS public.groovelab_tickets (
    ticket_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    station_number INTEGER NOT NULL,
    component_type groovelab_component_type NOT NULL,
    description TEXT,
    status groovelab_ticket_status DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Disable RLS for backend API operations
ALTER TABLE public.groovelab_tickets DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.groovelab_tickets TO authenticated, anon, service_role;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
