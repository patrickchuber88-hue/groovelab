-- Migration: 52_campus_erp_integration.sql
-- Description: Database schema extension for Campus ERP and Gamification system

-- 1. Extend schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50) DEFAULT 'standard', -- 'standard' (4.99 €) or 'solo' (2.49 €)
ADD COLUMN IF NOT EXISTS has_campus_subscription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_groovelab_subscription BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_kombi_discount BOOLEAN DEFAULT FALSE;

-- Trigger to automatically calculate combined (kombi) discount on subscription flags change
CREATE OR REPLACE FUNCTION check_kombi_discount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.has_campus_subscription = TRUE AND NEW.has_groovelab_subscription = TRUE THEN
        NEW.has_kombi_discount := TRUE;
    ELSE
        NEW.has_kombi_discount := FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_kombi_discount
BEFORE INSERT OR UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION check_kombi_discount();

-- 2. Extend user_role enum and users table
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'secretary';

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_app_user BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_campus_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_groovelab_active BOOLEAN DEFAULT FALSE;

-- 3. Instruments and Room acoustic compatibility matrix
CREATE TABLE IF NOT EXISTS public.instruments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    acoustic_noise_level INT DEFAULT 3, -- 1 (silent/headphones) to 5 (very loud)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.room_instrument_compatibility (
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    instrument_id UUID REFERENCES public.instruments(id) ON DELETE CASCADE,
    suitability_score INT DEFAULT 5, -- 1 (incompatible) to 5 (perfect fit)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (room_id, instrument_id)
);

-- 4. Two-Class Avatar system
CREATE TABLE IF NOT EXISTS public.avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    avatar_style VARCHAR(50) DEFAULT 'Standard_Silhouette', -- 'Standard_Silhouette' or 'Premium_Hero'
    instrument_type VARCHAR(100),
    evolution_level INT DEFAULT 1,
    asset_path TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: Automatically assign default silhouette avatar to non-app users and premium default to app users
CREATE OR REPLACE FUNCTION assign_default_avatar()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.avatars (user_id, avatar_style, instrument_type, evolution_level, asset_path)
    VALUES (
        NEW.id, 
        CASE WHEN NEW.is_app_user = TRUE THEN 'Premium_Hero' ELSE 'Standard_Silhouette' END,
        COALESCE(NEW.instrument, 'Unknown'),
        1,
        CASE WHEN NEW.is_app_user = TRUE THEN '/avatars/premium_default.png' ELSE '/avatars/silhouette_default.png' END
    ) ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_assign_default_avatar
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION assign_default_avatar();

-- Disable RLS for MVP local compatibility
ALTER TABLE public.instruments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_instrument_compatibility DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatars DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anonym and authenticated roles
GRANT ALL ON public.instruments TO authenticated, anon, service_role;
GRANT ALL ON public.room_instrument_compatibility TO authenticated, anon, service_role;
GRANT ALL ON public.avatars TO authenticated, anon, service_role;

-- 5. Billing / Subscription View for active users counting metric
CREATE OR REPLACE VIEW public.active_licence_metrics AS
SELECT 
    school_id,
    COUNT(CASE WHEN is_app_user = TRUE AND is_campus_active = TRUE THEN 1 END) as active_campus_users,
    COUNT(CASE WHEN is_app_user = TRUE AND is_groovelab_active = TRUE THEN 1 END) as active_groovelab_users,
    COUNT(CASE WHEN is_app_user = TRUE AND (is_campus_active = TRUE OR is_groovelab_active = TRUE) THEN 1 END) as total_billable_app_users
FROM 
    public.users
GROUP BY 
    school_id;
