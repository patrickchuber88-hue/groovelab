-- ==============================================================================
-- Migration 534: Enterprise Message Crypto Fail-Closed & Header Resilience
-- Bounded Context: SEC-24 (Client-Side Decryption Vault & OWASP ASVS Level 3)
--
-- Invariants & Architectural Remediation:
-- 1. Fail-Closed Masking in decrypt_message_batch:
--    If caller authorization fails, NEVER return raw 'enc:' ciphertexts (Zero-Ciphertext Leakage).
--    Mask all encrypted contents to '[Verschlüsselt - Keine Zugriffsberechtigung]'.
-- 2. Resilient School Access Resolution:
--    If p_school_id is NULL, automatically resolve school from get_current_user_school_id().
-- 3. Resilient Triple-Key Waterfall:
--    Attempt 1: School-specific key from private_auth.get_or_create_school_message_key(v_target_school)
--    Attempt 2: Master salt ('campus_groovelab_default_master_salt_2026')
--    Attempt 3: General system key ('groovelab-default-local-encryption-key-123!')
-- ==============================================================================

-- 1. Resilient Single-Message Decryption RPC
CREATE OR REPLACE FUNCTION public.decrypt_message_content(
    p_content text,
    p_school_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_target_school uuid;
    v_school_key text;
    v_master_salt text := 'campus_groovelab_default_master_salt_2026';
    v_general_key text;
    v_cipher_bytes bytea;
    v_decrypted text;
    v_is_authorized boolean := false;
BEGIN
    IF p_content IS NULL OR p_content = '' OR NOT (p_content LIKE 'enc:%') THEN
        RETURN p_content;
    END IF;

    -- Resolve effective school ID if missing
    v_target_school := COALESCE(p_school_id, public.get_current_user_school_id());

    -- Authorization Guard
    IF public.is_master_admin() THEN
        v_is_authorized := true;
    ELSIF v_target_school IS NOT NULL AND public.check_school_access(v_target_school) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RETURN '[Verschlüsselt - Keine Zugriffsberechtigung]';
    END IF;

    -- Load keys
    IF v_target_school IS NOT NULL THEN
        v_school_key := private_auth.get_or_create_school_message_key(v_target_school);
    END IF;

    BEGIN
        v_general_key := COALESCE(
            NULLIF(current_setting('app.settings.encryption_key', true), ''),
            'groovelab-default-local-encryption-key-123!'
        );
    EXCEPTION WHEN OTHERS THEN
        v_general_key := 'groovelab-default-local-encryption-key-123!';
    END;

    BEGIN
        v_cipher_bytes := decode(substring(p_content FROM 5), 'base64');
    EXCEPTION WHEN OTHERS THEN
        RETURN '[Verschlüsselte Nachricht]';
    END;

    -- Attempt 1: School-specific key
    IF v_school_key IS NOT NULL THEN
        BEGIN
            v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_school_key);
            RETURN v_decrypted;
        EXCEPTION WHEN OTHERS THEN
            v_decrypted := NULL;
        END IF;
    END IF;

    -- Attempt 2: Master Salt Fallback
    IF v_master_salt IS NOT NULL THEN
        BEGIN
            v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_master_salt);
            RETURN v_decrypted;
        EXCEPTION WHEN OTHERS THEN
            v_decrypted := NULL;
        END IF;
    END IF;

    -- Attempt 3: General System Key Fallback
    IF v_general_key IS NOT NULL THEN
        BEGIN
            v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_general_key);
            RETURN v_decrypted;
        EXCEPTION WHEN OTHERS THEN
            v_decrypted := NULL;
        END IF;
    END IF;

    RETURN '[Verschlüsselte Nachricht]';
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrypt_message_content(text, uuid) TO authenticated, anon, service_role;

-- 2. Resilient Batch Decryption RPC (High-Performance for Chat Views)
CREATE OR REPLACE FUNCTION public.decrypt_message_batch(
    p_messages jsonb,
    p_school_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_target_school uuid;
    v_school_key text;
    v_master_salt text := 'campus_groovelab_default_master_salt_2026';
    v_general_key text;
    v_msg jsonb;
    v_result jsonb := '[]'::jsonb;
    v_content text;
    v_cipher_bytes bytea;
    v_decrypted text;
    v_is_authorized boolean := false;
BEGIN
    IF p_messages IS NULL OR jsonb_array_length(p_messages) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    -- Resolve effective school ID if missing
    v_target_school := COALESCE(p_school_id, public.get_current_user_school_id());

    -- Authorization Guard
    IF public.is_master_admin() THEN
        v_is_authorized := true;
    ELSIF v_target_school IS NOT NULL AND public.check_school_access(v_target_school) THEN
        v_is_authorized := true;
    END IF;

    -- FAIL-CLOSED PROTECTION: If not authorized, mask all encrypted messages. Never leak raw ciphertexts!
    IF NOT v_is_authorized THEN
        FOR v_msg IN SELECT * FROM jsonb_array_elements(p_messages) LOOP
            v_content := v_msg->>'content';
            IF v_content IS NOT NULL AND v_content LIKE 'enc:%' THEN
                v_msg := jsonb_set(v_msg, '{content}', '"[Verschlüsselt - Keine Zugriffsberechtigung]"'::jsonb);
            END IF;
            v_result := v_result || jsonb_build_array(v_msg);
        END LOOP;
        RETURN v_result;
    END IF;

    -- Preload keys once for the entire batch
    IF v_target_school IS NOT NULL THEN
        v_school_key := private_auth.get_or_create_school_message_key(v_target_school);
    END IF;

    BEGIN
        v_general_key := COALESCE(
            NULLIF(current_setting('app.settings.encryption_key', true), ''),
            'groovelab-default-local-encryption-key-123!'
        );
    EXCEPTION WHEN OTHERS THEN
        v_general_key := 'groovelab-default-local-encryption-key-123!';
    END;

    FOR v_msg IN SELECT * FROM jsonb_array_elements(p_messages) LOOP
        v_content := v_msg->>'content';
        IF v_content IS NOT NULL AND v_content LIKE 'enc:%' THEN
            v_decrypted := NULL;
            BEGIN
                v_cipher_bytes := decode(substring(v_content FROM 5), 'base64');
            EXCEPTION WHEN OTHERS THEN
                v_cipher_bytes := NULL;
            END;

            IF v_cipher_bytes IS NOT NULL THEN
                -- Attempt 1: School-specific key
                IF v_school_key IS NOT NULL THEN
                    BEGIN
                        v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_school_key);
                    EXCEPTION WHEN OTHERS THEN
                        v_decrypted := NULL;
                    END;
                END IF;

                -- Attempt 2: Master Salt Fallback
                IF v_decrypted IS NULL AND v_master_salt IS NOT NULL THEN
                    BEGIN
                        v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_master_salt);
                    EXCEPTION WHEN OTHERS THEN
                        v_decrypted := NULL;
                    END;
                END IF;

                -- Attempt 3: General System Key Fallback
                IF v_decrypted IS NULL AND v_general_key IS NOT NULL THEN
                    BEGIN
                        v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_general_key);
                    EXCEPTION WHEN OTHERS THEN
                        v_decrypted := NULL;
                    END;
                END IF;
            END IF;

            IF v_decrypted IS NOT NULL THEN
                v_msg := jsonb_set(v_msg, '{content}', to_jsonb(v_decrypted));
            ELSE
                v_msg := jsonb_set(v_msg, '{content}', '"[Verschlüsselte Nachricht]"'::jsonb);
            END IF;
        END IF;

        v_result := v_result || jsonb_build_array(v_msg);
    END LOOP;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrypt_message_batch(jsonb, uuid) TO authenticated, anon, service_role;

NOTIFY pgrst, 'reload schema';
