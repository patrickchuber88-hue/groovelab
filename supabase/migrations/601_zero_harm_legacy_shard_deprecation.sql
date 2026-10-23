-- ==============================================================================
-- 🛡️ Migration 601: Zero-Harm Legacy Shard Deprecation (DIN 66398 & DSGVO Art. 17)
-- Standards: BSI TR-02102-1, OWASP ASVS Level 3, EuGH C-413/23 P
-- Zweck: Geordnete, risikofreie Stilllegung historischer Klartext- und Shard-Tabellen
--        (student_last_names, student_first_names aus Migration 135/514).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. PREFLIGHT-PARITÄTSPRÜFUNG: 100% Vault-Abdeckung vor Quarantäne
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_missing_count INT := 0;
BEGIN
    IF to_regclass('public.student_last_names') IS NOT NULL AND to_regclass('private_auth.blind_student_lastname_vault') IS NOT NULL THEN
        -- Prüfe, ob es Datensätze in student_last_names gibt, die noch nicht im Vault liegen
        SELECT COUNT(*) INTO v_missing_count
        FROM public.student_last_names sln
        JOIN public.users_raw ur ON sln.student_id = ur.id
        WHERE NOT EXISTS (
            SELECT 1 FROM private_auth.blind_student_lastname_vault v
            WHERE v.blind_link_hmac = encode(
                extensions.hmac(
                    ur.id::text || ':' || ur.school_id::text,
                    public.get_encryption_key(),
                    'sha256'
                ),
                'hex'
            )
        );

        IF v_missing_count > 0 THEN
            RAISE NOTICE 'Forensische Parität: % Datensätze aus student_last_names werden in den Vault nachmigriert.', v_missing_count;
            
            INSERT INTO private_auth.blind_student_lastname_vault (
                blind_link_hmac, school_id, encrypted_lastname, updated_at
            )
            SELECT 
                encode(extensions.hmac(ur.id::text || ':' || ur.school_id::text, public.get_encryption_key(), 'sha256'), 'hex'),
                ur.school_id,
                CASE 
                    WHEN pg_typeof(sln.last_name) = 'bytea'::regtype THEN sln.last_name::bytea
                    ELSE extensions.pgp_sym_encrypt(sln.last_name::text, public.get_encryption_key())
                END,
                clock_timestamp()
            FROM public.student_last_names sln
            JOIN public.users_raw ur ON sln.student_id = ur.id
            ON CONFLICT (blind_link_hmac) DO NOTHING;
        END IF;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 2. QUARANTÄNE-ISOLIERUNG: Tabellen umbenennen und Berechtigungen entziehen
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    -- student_last_names isolieren
    IF to_regclass('public.student_last_names') IS NOT NULL THEN
        ALTER TABLE public.student_last_names RENAME TO _deprecated_student_last_names_quarantine;
        REVOKE ALL ON TABLE public._deprecated_student_last_names_quarantine FROM PUBLIC, anon, authenticated;
        GRANT ALL ON TABLE public._deprecated_student_last_names_quarantine TO postgres, service_role;
        COMMENT ON TABLE public._deprecated_student_last_names_quarantine IS 'DIN 66398 Quarantäne: Altdatenbank-Shard vor endgültigem Purge. Vollständig abgelöst durch private_auth.blind_student_lastname_vault.';
    END IF;

    -- student_first_names isolieren
    IF to_regclass('public.student_first_names') IS NOT NULL THEN
        ALTER TABLE public.student_first_names RENAME TO _deprecated_student_first_names_quarantine;
        REVOKE ALL ON TABLE public._deprecated_student_first_names_quarantine FROM PUBLIC, anon, authenticated;
        GRANT ALL ON TABLE public._deprecated_student_first_names_quarantine TO postgres, service_role;
        COMMENT ON TABLE public._deprecated_student_first_names_quarantine IS 'DIN 66398 Quarantäne: Altdatenbank-Shard vor endgültigem Purge. Vollständig abgelöst durch users_raw.first_name.';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. REVISIONSSICHERES AUDIT-LOG
-- ------------------------------------------------------------------------------
INSERT INTO public.audit_logs (
    table_name, record_id, action, details
) VALUES (
    'legacy_identity_shards',
    '00000000-0000-0000-0000-000000000000'::UUID,
    'DIN66398_ZERO_HARM_DEPRECATION',
    jsonb_build_object(
        'standard', 'DIN 66398 Stufenplan',
        'quarantine_tables', ARRAY['_deprecated_student_last_names_quarantine', '_deprecated_student_first_names_quarantine'],
        'vault_successor', 'private_auth.blind_student_lastname_vault',
        'timestamp', clock_timestamp()
    )
);

COMMIT;
