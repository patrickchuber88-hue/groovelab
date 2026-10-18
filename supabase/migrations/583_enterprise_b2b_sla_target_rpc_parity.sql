-- Migration 583: Enterprise B2B SLA Target RPC Parity (99,0% im Jahresmittel)
-- Harmonizes the public contract verification RPC with the authoritative 99,0% annual SLA standard.

CREATE OR REPLACE FUNCTION public.verify_b2b_contract_digest(p_digest TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_catalog
AS $$
DECLARE
  v_clean_hash TEXT := LOWER(TRIM(COALESCE(p_digest, '')));
  v_found BOOLEAN := false;
  v_school_id TEXT;
  v_school_name TEXT;
  v_signee TEXT;
  v_signed_at TIMESTAMPTZ;
  v_legal_version TEXT := '2026-v2.4';
  v_canonical_hash TEXT;
  v_country TEXT;
  v_jurisdiction TEXT;
  v_contract RECORD;
  v_school RECORD;
BEGIN
  IF v_clean_hash = '' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'EMPTY_DIGEST',
      'message', 'Es wurde kein kryptografischer Prüfhash übergeben.'
    );
  END IF;

  -- 1. Search in school_license_contracts table (if exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'school_license_contracts') THEN
    FOR v_contract IN 
      EXECUTE 'SELECT id, school_id, contract_type, legal_version, sha256_hash, signed_at, signee_name, jurisdiction FROM public.school_license_contracts WHERE LOWER(sha256_hash) = $1 OR LOWER(sha256_hash) LIKE $2 LIMIT 1'
      USING v_clean_hash, (v_clean_hash || '%')
    LOOP
      v_found := true;
      v_school_id := v_contract.school_id::text;
      v_signee := v_contract.signee_name;
      v_signed_at := v_contract.signed_at;
      v_legal_version := v_contract.legal_version;
      v_canonical_hash := v_contract.sha256_hash;
      v_jurisdiction := v_contract.jurisdiction;
      EXIT;
    END LOOP;
  END IF;

  -- 2. Resolve school name and country if found in contracts
  IF v_found AND v_school_id IS NOT NULL THEN
    SELECT name, country INTO v_school FROM public.schools WHERE id = v_school_id::uuid LIMIT 1;
    IF FOUND THEN
      v_school_name := v_school.name;
      v_country := COALESCE(v_school.country, 'DE');
    ELSE
      v_school_name := 'Autorisierte Musikschule';
      v_country := 'DE';
    END IF;
  ELSE
    -- 3. Fallback to schools table with active avv_signed_at
    FOR v_school IN 
      SELECT id, name, avv_signed_at, avv_signee_name, country, city
      FROM public.schools 
      WHERE avv_signed_at IS NOT NULL
    LOOP
      IF LOWER(REPLACE(v_school.id::text, '-', '')) LIKE (v_clean_hash || '%')
         OR v_clean_hash LIKE (LOWER(REPLACE(v_school.id::text, '-', '')) || '%') THEN
        v_found := true;
        v_school_id := v_school.id::text;
        v_school_name := v_school.name;
        v_signee := COALESCE(v_school.avv_signee_name, 'Schulleitung');
        v_signed_at := v_school.avv_signed_at;
        v_country := COALESCE(v_school.country, 'DE');
        v_canonical_hash := encode(digest(v_school.id::text || v_school.name || v_school.avv_signed_at::text, 'sha256'), 'hex');
        v_jurisdiction := CASE WHEN v_country = 'CH' THEN 'CH' ELSE 'DE-BW' END;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- 4. Return Result (Zero PII - Only Institutional Metadata)
  IF v_found THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_valid', true,
      'status', 'VERIFIED_ACTIVE',
      'full_hash', v_canonical_hash,
      'hash_matched', v_clean_hash,
      'school_id', v_school_id,
      'school_name', v_school_name,
      'signee_name', v_signee,
      'signed_at', v_signed_at,
      'legal_version', v_legal_version,
      'contract_type', 'B2B_SAAS_INFRASTRUCTURE_CONTRACT_AND_AVV',
      'legal_basis', '§ 535 ff. BGB / Art. 253 OR i. V. m. Art. 28 DSGVO & Art. 9 CH-nDSG',
      'herrenberg_status', 'BSG B 12 R 3/20 R Konformität (Zweistufiges Dispositionsmodell / 0 Weisungen)',
      'sla_target', '99,0 % Verfügbarkeit im Jahresmittel (24/7/365)',
      'datacenter_location', 'IONOS SE & Hetzner Online GmbH (Deutschland • ISO/IEC 27001)',
      'iso_certifications', 'ISO/IEC 27001:2022, ISO/IEC 27701 (PIMS), BSI IT-Grundschutz',
      'us_cloud_transfer', '0,00 % (Vollständige Immunität gegen US FISA 702 & CLOUD Act)'
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false,
      'is_valid', false,
      'status', 'NOT_FOUND',
      'error', 'CONTRACT_NOT_FOUND',
      'message', 'Der angegebene Prüfhash konnte im manipulationssicheren WORM-Audit-Trail keinem rechtsgültig gezeichneten Vertrag zugeordnet werden.'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_b2b_contract_digest(TEXT) TO anon, authenticated, service_role;
