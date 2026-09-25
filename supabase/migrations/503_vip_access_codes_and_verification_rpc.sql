-- ==============================================================================
-- Migration 503: Zero-Leakage VIP Access Codes & Authoritative Verification RPC
-- OWASP ASVS L3 Fail-Closed Doktrin / Zero Secret Leakage in Client Bundles
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. VIP Access Codes Storage Table (Default-Deny)
CREATE TABLE IF NOT EXISTS public.vip_access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  use_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS Enforcement: Default Deny
ALTER TABLE public.vip_access_codes ENABLE ROW LEVEL SECURITY;

-- Strict Grant Separation: No direct client access (anon/authenticated denied)
REVOKE ALL ON TABLE public.vip_access_codes FROM anon, authenticated;
GRANT ALL ON TABLE public.vip_access_codes TO service_role, postgres;

-- 2. Authoritative Verification RPC
CREATE OR REPLACE FUNCTION public.verify_vip_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text;
  v_hash text;
  v_record record;
  v_session_token text;
BEGIN
  -- Strict sanitization
  IF p_code IS NULL OR length(trim(p_code)) < 3 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_CODE',
      'message', 'Bitte geben Sie einen gültigen Einladungscode ein.'
    );
  END IF;

  v_normalized := upper(trim(p_code));
  -- Cryptographic salted SHA-256 (Server-Side Salt protects against dictionary attacks)
  v_hash := encode(sha256((v_normalized || '::campus_vip_salt_2026')::bytea), 'hex');

  -- Lookup active code
  SELECT id, label, is_active
  INTO v_record
  FROM public.vip_access_codes
  WHERE code_hash = v_hash;

  IF NOT FOUND OR v_record.is_active IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_CODE',
      'message', 'Ungültiger Einladungscode. Bitte prüfen Sie die Eingabe.'
    );
  END IF;

  -- Update audit metrics
  UPDATE public.vip_access_codes
  SET use_count = use_count + 1,
      last_used_at = now()
  WHERE id = v_record.id;

  -- Generate secure session grant token
  v_session_token := encode(sha256((v_hash || '::granted::' || now()::text)::bytea), 'hex');

  RETURN jsonb_build_object(
    'success', true,
    'label', v_record.label,
    'token', v_session_token
  );
END;
$$;

-- Grant RPC execution to anon & authenticated visitors
GRANT EXECUTE ON FUNCTION public.verify_vip_invite_code(text) TO anon, authenticated;

-- 3. Initial Seed Codes (Stored only as salted hashes)
INSERT INTO public.vip_access_codes (code_hash, label, is_active)
VALUES
  (encode(sha256(('CAMPUS-2026' || '::campus_vip_salt_2026')::bytea), 'hex'), 'Campus 2026 Master Access', true),
  (encode(sha256(('CAMPUS2026' || '::campus_vip_salt_2026')::bytea), 'hex'), 'Campus 2026 Master Access (No Dash)', true),
  (encode(sha256(('CAMPUS-PILOT-2026' || '::campus_vip_salt_2026')::bytea), 'hex'), 'Pilot Partner 2026', true),
  (encode(sha256(('LAHR-2026' || '::campus_vip_salt_2026')::bytea), 'hex'), 'Musikschule Lahr Preview', true),
  (encode(sha256(('GROOVE-VIP-2026' || '::campus_vip_salt_2026')::bytea), 'hex'), 'Internal Team Access', true)
ON CONFLICT (code_hash) DO UPDATE
SET is_active = EXCLUDED.is_active,
    label = EXCLUDED.label;
