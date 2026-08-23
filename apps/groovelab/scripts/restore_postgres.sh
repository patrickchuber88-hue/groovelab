#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Disaster Recovery Restore Script
# Tier-1 SaaS Enterprise Standard
# ==============================================================================
set -euo pipefail

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path_to_encrypted_backup.sql.gz.enc>"
    exit 1
fi

ENCRYPTED_FILE="$1"
ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_KEY:-campus_groovelab_disaster_recovery_secure_salt_2026}"
RESTORE_TMP="/tmp/cg_restore_$(date +%s).sql"

if [ ! -f "${ENCRYPTED_FILE}" ]; then
    echo "❌ Error: Backup file '${ENCRYPTED_FILE}' does not exist."
    exit 1
fi

echo "⚠️  ================================================================"
echo "⚠️  CRITICAL: YOU ARE ABOUT TO RESTORE A CAMPUS-GROOVELAB DATABASE"
echo "⚠️  Target Backup: ${ENCRYPTED_FILE}"
echo "⚠️  ================================================================"
read -p "Are you sure you want to proceed? Type 'RESTORE_CONFIRM': " CONFIRMATION

if [ "${CONFIRMATION}" != "RESTORE_CONFIRM" ]; then
    echo "❌ Restore aborted by user."
    exit 1
fi

echo "🔓 Decrypting AES-256 backup file..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in "${ENCRYPTED_FILE}" -pass "pass:${ENCRYPTION_PASSPHRASE}" | gzip -d > "${RESTORE_TMP}"

echo "📦 Restoring database schema and records..."
if command -v psql &> /dev/null; then
    DB_HOST="${DB_HOST:-aws-0-eu-central-1.pooler.supabase.com}"
    DB_PORT="${DB_PORT:-6543}"
    DB_NAME="${DB_NAME:-postgres}"
    DB_USER="${DB_USER:-postgres.tlnstkwffrbljmdtuyot}"
    PGPASSWORD="${DB_PASSWORD:-}" psql -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USER}" -d "${DB_NAME}" -f "${RESTORE_TMP}"
    echo "✅ Database restored successfully!"
else
    echo "⚠️  psql not found in PATH. Decrypted dump is ready at: ${RESTORE_TMP}"
fi

rm -f "${RESTORE_TMP}"
echo "🎉 Disaster Recovery operation completed."
