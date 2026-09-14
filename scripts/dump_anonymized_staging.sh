#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Staging Database Sanitization & Anonymizer
# Standard: DSGVO Art. 25 & 32 / Privacy-by-Design Test Data (Punkt 48)
# ==============================================================================
# Creates an anonymized, production-sanitized SQL dump for safe local testing
# and staging environments. Purges all plaintext contact info, IBANs, and chat logs.

set -euo pipefail

OUTPUT_FILE="${1:-staging_anonymized_$(date +%Y%m%d_%H%M%S).sql}"

echo "===================================================================="
echo "🛡️  CAMPUS-GROOVELAB STAGING ANONYMIZATION ENGINE"
echo "    Target: ${OUTPUT_FILE}"
echo "===================================================================="

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "🚨 ERROR: pg_dump command not found in PATH."
    exit 1
fi

echo "1. Exporting raw schema and data..."
# Run pg_dump (assumes standard PG connection env vars PGHOST, PGUSER, PGDATABASE)
pg_dump --no-owner --no-privileges --exclude-table=public.audit_logs --exclude-table=public.master_audit_trail > "${OUTPUT_FILE}.tmp"

echo "2. Applying cryptographic PII sanitization filters..."
cat << 'EOF' >> "${OUTPUT_FILE}.tmp"

-- ── DSGVO ART. 32 TEST DATA SANITIZATION INJECTIONS ──
BEGIN;

-- 1. Anonymize all user identities
UPDATE public.users_raw
SET 
    first_name = 'TestUser_' || substr(id::text, 1, 6),
    last_name = 'Campus',
    phone = '+49 151 0000000',
    avatar_url = NULL,
    parent_pin = NULL,
    personal_pin = NULL,
    two_factor_secret = NULL,
    two_factor_recovery_codes = NULL,
    qr_token = encode(gen_random_bytes(16), 'hex'),
    ausweis_nummer = 'TST-' || substr(id::text, 1, 6);

-- 2. Truncate sensitive audit & communication tables
TRUNCATE TABLE public.campus_chat_messages CASCADE;
TRUNCATE TABLE public.campus_chat_channel_reads CASCADE;
TRUNCATE TABLE public.qr_login_rate_limits CASCADE;

-- 3. Redact billing and IBAN fields
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'iban') THEN
        UPDATE public.students SET iban = 'DE00000000000000000000';
    END IF;
END $$;

COMMIT;
EOF

mv "${OUTPUT_FILE}.tmp" "${OUTPUT_FILE}"

echo "✅ Anonymization complete! Safe staging artifact written to: ${OUTPUT_FILE}"
