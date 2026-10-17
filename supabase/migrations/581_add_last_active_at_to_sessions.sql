-- ==============================================================================
-- 581_add_last_active_at_to_sessions.sql
-- Bounded Context: Auth & Session Management / Student Dashboard Bootstrap Parity
-- Standard: OWASP ASVS Level 3 / Fail-Closed
-- ==============================================================================

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_sessions_last_active_at 
  ON public.sessions(last_active_at DESC);

NOTIFY pgrst, 'reload schema';
