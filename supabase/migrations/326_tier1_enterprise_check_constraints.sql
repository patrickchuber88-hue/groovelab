-- ==============================================================================
-- Migration 326: Tier-1 SaaS Enterprise+ Check Constraints (Defense in Depth)
-- Anchors Zod Schema validations directly into the PostgreSQL kernel.
-- Prevents bypass of application-level sanitization via direct API/RPC calls.
-- ==============================================================================

-- 1. Hardening users_raw
ALTER TABLE public.users_raw
  ADD CONSTRAINT chk_users_raw_email_format 
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE public.users_raw
  ADD CONSTRAINT chk_users_raw_first_name_length 
  CHECK (char_length(first_name) >= 1 AND char_length(first_name) <= 100);

-- 2. Hardening sessions (Zero Trust Limits)
ALTER TABLE public.sessions
  ADD CONSTRAINT chk_sessions_user_agent_length
  CHECK (user_agent IS NULL OR char_length(user_agent) <= 500);

-- 3. Hardening Schools (Mandant Isolation)
ALTER TABLE public.schools
  ADD CONSTRAINT chk_schools_name_length
  CHECK (char_length(name) >= 2 AND char_length(name) <= 150);

-- 4. BOLA / IDOR Verification Comment
-- Audit has confirmed that Migration 322 enforces RLS accurately across all entities via:
-- USING (school_id = public.get_current_user_school_id())
-- This guarantees tenant separation dynamically at the Row Level.
