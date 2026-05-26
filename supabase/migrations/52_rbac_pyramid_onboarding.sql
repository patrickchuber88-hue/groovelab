-- Migration 52: RBAC Pyramid, Safety-Wall, and Cascade Onboarding Schema

-- 1. Update schools table
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS admin_pin TEXT;
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS allow_global_ranking BOOLEAN DEFAULT FALSE;

-- 2. Update users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
-- Add UNIQUE constraint to email if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
END $$;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ausweis_id VARCHAR(6);
-- Add UNIQUE constraint to ausweis_id if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_ausweis_id_key'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT users_ausweis_id_key UNIQUE (ausweis_id);
    END IF;
END $$;

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personal_pin TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- 3-TAB-MATRIX Berechtigungs-Flags
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_sekretariat BOOLEAN DEFAULT FALSE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_campus BOOLEAN DEFAULT TRUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS show_groovelab BOOLEAN DEFAULT FALSE;

-- 3. Create teacher_invitations table
CREATE TABLE IF NOT EXISTS public.teacher_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token UUID UNIQUE DEFAULT uuid_generate_v4(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create premium_status table (0,49€ Upgrade)
CREATE TABLE IF NOT EXISTS public.premium_status (
    student_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    is_premium_active BOOLEAN DEFAULT FALSE,
    stripe_customer_id TEXT
);

-- 5. Trigger for automatic 6-digit unique ausweis_id generation
CREATE OR REPLACE FUNCTION public.generate_unique_ausweis_id()
RETURNS TRIGGER AS $$
DECLARE
    new_id VARCHAR(6);
    done BOOLEAN := FALSE;
BEGIN
    -- Only generate if it's a student, teacher, or admin, and not already provided
    IF NEW.ausweis_id IS NOT NULL AND NEW.ausweis_id <> '' THEN
        RETURN NEW;
    END IF;

    WHILE NOT done LOOP
        -- Generate random 6-digit number as string
        new_id := lpad(floor(random() * 1000000)::text, 6, '0');
        
        -- Check uniqueness
        IF NOT EXISTS (SELECT 1 FROM public.users WHERE ausweis_id = new_id) THEN
            done := TRUE;
        END IF;
    END LOOP;

    NEW.ausweis_id := new_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_ausweis_id ON public.users;
CREATE TRIGGER trigger_generate_ausweis_id
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.generate_unique_ausweis_id();

-- Disable RLS on new tables for MVP operations
ALTER TABLE public.teacher_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_status DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.teacher_invitations TO authenticated, anon, service_role;
GRANT ALL ON public.premium_status TO authenticated, anon, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
