-- ==============================================================================
-- Migration 367: Hiscox CyberSafe 05/2026 VPN & Fernzugriffe Governance
-- Add mfa_enforced_for_admins to schools & schools_raw
-- Standard: OWASP ASVS Level 3 / NIST SP 800-207 Zero Trust
-- ==============================================================================

ALTER TABLE IF EXISTS public.schools ADD COLUMN IF NOT EXISTS mfa_enforced_for_admins BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.schools_raw ADD COLUMN IF NOT EXISTS mfa_enforced_for_admins BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.schools.mfa_enforced_for_admins IS 'Enforces mandatory 2FA/MFA (TOTP/WebAuthn) for school administrators accessing the platform remotely (Hiscox CyberSafe 05/2026).';
