-- ==============================================================================
-- Migration 465: Enterprise Message Crypto Dual-Key Resilience & Self-Healing
-- 
-- Root Cause Resolution:
-- When messages were inserted without school_id (NEW.school_id IS NULL),
-- private_auth.get_or_create_school_message_key(NULL) defaulted to the master salt:
-- 'campus_groovelab_default_master_salt_2026'.
-- When decrypting, decrypt_message_batch(p_messages, p_school_id) received the
-- school UUID and attempted decryption with the school-specific 32-byte hex key,
-- causing a "Wrong key or corrupt data" exception and rendering "[Verschlüsselte Nachricht]".
--
-- Architectural Invariants & Goldstandard Solution:
-- 1. Resilient Waterfall Decryption:
--    Attempt 1: School-specific key (private_auth.get_or_create_school_message_key(p_school_id))
--    Attempt 2 (Fallback): Default master salt ('campus_groovelab_default_master_salt_2026')
--    Attempt 3 (Fallback): General system key (COALESCE(public.get_encryption_key(), 'groovelab-default-local-encryption-key-123!'))
--    Only if all three fail, return '[Verschlüsselte Nachricht]'.
-- 2. Self-Healing Encryption Trigger:
--    If NEW.school_id IS NULL, automatically resolve school_id from sender_id or recipient_id
--    via public.users_raw before encryption and physical disk persistence.
-- 3. Retroactive Data Backfill:
--    Populate missing school_id on existing campus_direct_messages from users_raw.
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
    v_school_key text;
    v_master_salt text := 'campus_groovelab_default_master_salt_2026';
    v_general_key text;
    v_cipher_bytes bytea;
    v_decrypted text;
BEGIN
    IF p_content IS NULL OR p_content = '' OR NOT (p_content LIKE 'enc:%') THEN
        RETURN p_content;
    END IF;

    -- Security Guard: Verify caller belongs to school or is Master Admin
    IF NOT (public.is_master_admin() OR public.check_school_access(p_school_id)) THEN
        RETURN '[Verschlüsselt - Keine Zugriffsberechtigung]';
    END IF;

    -- Load keys
    IF p_school_id IS NOT NULL THEN
        v_school_key := private_auth.get_or_create_school_message_key(p_school_id);
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
        END;
    END IF;

    -- Attempt 2: Master Salt Fallback (used when message was encrypted with school_id = NULL)
    IF v_master_salt IS NOT NULL THEN
        BEGIN
            v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_master_salt);
            RETURN v_decrypted;
        EXCEPTION WHEN OTHERS THEN
            v_decrypted := NULL;
        END;
    END IF;

    -- Attempt 3: General System Key Fallback
    IF v_general_key IS NOT NULL THEN
        BEGIN
            v_decrypted := extensions.pgp_sym_decrypt(v_cipher_bytes, v_general_key);
            RETURN v_decrypted;
        EXCEPTION WHEN OTHERS THEN
            v_decrypted := NULL;
        END;
    END IF;

    RETURN '[Verschlüsselte Nachricht]';
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrypt_message_content(text, uuid) TO authenticated, anon, service_role;

-- 2. Resilient Batch Decryption RPC (High-Performance for Chat View Loading)
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
    v_school_key text;
    v_master_salt text := 'campus_groovelab_default_master_salt_2026';
    v_general_key text;
    v_msg jsonb;
    v_result jsonb := '[]'::jsonb;
    v_content text;
    v_cipher_bytes bytea;
    v_decrypted text;
BEGIN
    IF p_messages IS NULL OR jsonb_array_length(p_messages) = 0 THEN
        RETURN '[]'::jsonb;
    END IF;

    IF NOT (public.is_master_admin() OR public.check_school_access(p_school_id)) THEN
        RETURN p_messages;
    END IF;

    -- Preload keys once for the entire batch
    IF p_school_id IS NOT NULL THEN
        v_school_key := private_auth.get_or_create_school_message_key(p_school_id);
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

-- 3. Self-Healing Encryption Trigger Function
CREATE OR REPLACE FUNCTION public.trg_encrypt_campus_direct_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private_auth, extensions, pg_catalog
AS $$
DECLARE
    v_secret text;
    v_resolved_school uuid;
BEGIN
    -- Self-Healing: If school_id is missing, resolve it from sender or recipient
    IF NEW.school_id IS NULL THEN
        IF NEW.sender_id IS NOT NULL THEN
            SELECT school_id INTO v_resolved_school 
            FROM public.users_raw 
            WHERE id = NEW.sender_id;
        END IF;

        IF v_resolved_school IS NULL AND NEW.recipient_id IS NOT NULL THEN
            SELECT school_id INTO v_resolved_school 
            FROM public.users_raw 
            WHERE id = NEW.recipient_id;
        END IF;

        IF v_resolved_school IS NOT NULL THEN
            NEW.school_id := v_resolved_school;
        END IF;
    END IF;

    -- Encrypt plain text content before storage
    IF NEW.content IS NOT NULL AND NEW.content <> '' AND NOT (NEW.content LIKE 'enc:%') THEN
        v_secret := private_auth.get_or_create_school_message_key(NEW.school_id);
        NEW.content := 'enc:' || encode(extensions.pgp_sym_encrypt(NEW.content, v_secret), 'base64');
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure trigger runs on both INSERT and UPDATE
DROP TRIGGER IF EXISTS trg_encrypt_campus_direct_message_trigger ON public.campus_direct_messages;
CREATE TRIGGER trg_encrypt_campus_direct_message_trigger
    BEFORE INSERT OR UPDATE ON public.campus_direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_encrypt_campus_direct_message();

-- 4. Retroactive Data Hygiene: Backfill missing school_id from users_raw
UPDATE public.campus_direct_messages m
SET school_id = u.school_id
FROM public.users_raw u
WHERE m.school_id IS NULL 
  AND m.sender_id = u.id 
  AND u.school_id IS NOT NULL;

UPDATE public.campus_direct_messages m
SET school_id = u.school_id
FROM public.users_raw u
WHERE m.school_id IS NULL 
  AND m.recipient_id = u.id 
  AND u.school_id IS NOT NULL;

-- 5. Notify PostgREST to reload schema and RPC signatures
NOTIFY pgrst, 'reload schema';
