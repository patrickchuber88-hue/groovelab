-- Migration: 219_performance_and_token_opt
-- Description: Creates invite_tokens table, get_invite_token and get_invite_school_id client-info helpers, updates users_insert RLS policy on users_raw, and adds use-token trigger.

-- 1. Create invite_tokens table
CREATE TABLE IF NOT EXISTS public.invite_tokens (
    token TEXT PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.invite_tokens ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.invite_tokens ADD COLUMN IF NOT EXISTS used_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invite_tokens_policy ON public.invite_tokens;
CREATE POLICY invite_tokens_policy ON public.invite_tokens
FOR ALL USING (
    public.is_master_admin()
    OR (public.get_current_user_role() IN ('admin', 'secretary') AND public.check_school_access(school_id))
);

-- 2. Create client-info invite helper functions
DROP FUNCTION IF EXISTS public.get_invite_token();
CREATE OR REPLACE FUNCTION public.get_invite_token()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_token text;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    
    v_token := v_headers::json->>'x-invite-token';
    IF v_token IS NOT NULL AND v_token <> '' THEN
        RETURN v_token;
    END IF;
    
    v_client_info := v_headers::json->>'x-client-info';
    IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
        v_token := substring(v_client_info from ';invite_token=([^;]+)');
        IF v_token IS NOT NULL AND v_token <> '' THEN
            RETURN v_token;
        END IF;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

DROP FUNCTION IF EXISTS public.get_invite_school_id();
CREATE OR REPLACE FUNCTION public.get_invite_school_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
    v_headers text;
    v_school_id text;
    v_client_info text;
BEGIN
    v_headers := current_setting('request.headers', true);
    IF v_headers IS NULL OR v_headers = '' THEN
        RETURN NULL;
    END IF;
    
    v_school_id := v_headers::json->>'x-invite-school-id';
    IF v_school_id IS NOT NULL AND v_school_id <> '' THEN
        RETURN v_school_id::uuid;
    END IF;
    
    v_client_info := v_headers::json->>'x-client-info';
    IF v_client_info IS NOT NULL AND v_client_info <> '' THEN
        v_school_id := substring(v_client_info from ';invite_school_id=([^;]+)');
        IF v_school_id IS NOT NULL AND v_school_id <> '' THEN
            RETURN v_school_id::uuid;
        END IF;
    END IF;
    
    RETURN NULL;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- 3. Drop and recreate users_insert policy on users_raw
DROP POLICY IF EXISTS users_insert ON public.users_raw;
DROP POLICY IF EXISTS users_insert ON public.users;

CREATE POLICY users_insert ON public.users_raw
FOR INSERT
WITH CHECK (
    public.is_master_admin()
    OR ((public.get_user_school_id() = users_raw.school_id) AND public.is_teacher_or_admin())
    OR public.school_has_no_users(users_raw.school_id)
    OR (
        EXISTS (
            SELECT 1 FROM public.invite_tokens
            WHERE invite_tokens.token = public.get_invite_token()
              AND invite_tokens.school_id = users_raw.school_id
              AND invite_tokens.role = users_raw.role::text
              AND invite_tokens.used_at IS NULL
        )
    )
);

-- 4. Create trigger to automatically mark invite token as used
CREATE OR REPLACE FUNCTION public.process_invite_token_use()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.invite_tokens
    SET used_at = timezone('utc'::text, now())
    WHERE invite_tokens.token = public.get_invite_token()
      AND invite_tokens.school_id = NEW.school_id
      AND invite_tokens.role = NEW.role::text
      AND invite_tokens.used_at IS NULL;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_use_invite_token ON public.users_raw;
CREATE TRIGGER trg_use_invite_token
AFTER INSERT ON public.users_raw
FOR EACH ROW
EXECUTE FUNCTION public.process_invite_token_use();
