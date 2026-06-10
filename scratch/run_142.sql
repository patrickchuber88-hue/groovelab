-- Migration 142: Web Push VAPID Notifications Setup

-- 1. Add push_notifications_enabled to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT FALSE;

-- 2. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 4. Disable RLS or grant access for push_subscriptions & notifications
ALTER TABLE public.push_subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.push_subscriptions TO authenticated, anon, service_role;
GRANT ALL ON public.notifications TO authenticated, anon, service_role;

-- Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
