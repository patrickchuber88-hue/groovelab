#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Enterprise+ Automated Encrypted Backup Script
# Location: /usr/local/bin/backup_campus_db.sh
# Standard: BSI IT-Grundschutz & DSGVO Art. 32 (Verschlüsselte Offsite-Sicherung)
# ==============================================================================

set -euo pipefail
umask 077

# ── Konfiguration ([P1-5] Zero Hardcoded Secrets & Zero Plaintext Disk Touch) ──
BACKUP_DIR="/var/backups/campus-groovelab"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
AGE_RECIPIENT_FILE="${AGE_RECIPIENT_FILE:-/etc/campus-groovelab/backup_age_recipient.pub}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/etc/campus-groovelab/backup.key}"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starte verschlüsseltes Streaming-Backup für Campus-Groovelab..."

# [P1-5 & O-01] Multi-Recipient Age-X25519 Zero-Knowledge Stream Encryption (Primary Key + Vault Recovery Key)
AGE_RECIPIENT_ARGS=()
if [ -n "${AGE_RECIPIENT:-}" ]; then
    for rec in $AGE_RECIPIENT; do
        AGE_RECIPIENT_ARGS+=(-r "$rec")
    done
elif [ -f "${AGE_RECIPIENT_FILE}" ]; then
    while IFS= read -r line || [ -n "$line" ]; do
        clean_rec=$(echo "$line" | sed 's/#.*//' | tr -d '[:space:]')
        if [ -n "$clean_rec" ]; then
            AGE_RECIPIENT_ARGS+=(-r "$clean_rec")
            [ -z "${AGE_RECIPIENT:-}" ] && AGE_RECIPIENT="$clean_rec"
        fi
    done < "${AGE_RECIPIENT_FILE}"
fi

# 1. PostgreSQL Dump direkt im RAM komprimieren und asymmetrisch via age -r "$AGE_RECIPIENT" verschlüsseln (Zero Plaintext & Zero Local Keyfile)
if command -v age >/dev/null 2>&1 && [ "${#AGE_RECIPIENT_ARGS[@]}" -gt 0 ]; then
    ENCRYPTED_BACKUP="${BACKUP_DIR}/dump_${TIMESTAMP}.sql.gz.age"
    docker exec -t "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" \
        | gzip -9 \
        | age "${AGE_RECIPIENT_ARGS[@]}" > "${ENCRYPTED_BACKUP}"
else
    echo "❌ FATAL [O-01 / P1-5]: 'age' Binary oder AGE_RECIPIENT (${AGE_RECIPIENT_FILE}) fehlt. Symmetrische Server-Keyfiles und Klartext-Dumps sind verboten (Fail-Closed Abbruch)!" >&2
    exit 1
fi

chmod 600 "${ENCRYPTED_BACKUP}"
sha256sum "${ENCRYPTED_BACKUP}" > "${ENCRYPTED_BACKUP}.sha256"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Verschlüsseltes Backup erfolgreich erstellt: ${ENCRYPTED_BACKUP}"

# 2. Offsite-Replikation zur Hetzner Storage Box (falls konfiguriert)
if [ -n "${STORAGE_BOX_USER:-}" ] && [ -n "${STORAGE_BOX_HOST:-}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Repliziere Backup zur Hetzner Storage Box..."
    rsync -avz -e "ssh -p ${STORAGE_BOX_PORT:-23}" "${ENCRYPTED_BACKUP}" "${ENCRYPTED_BACKUP}.sha256" "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_DEST:-/home/backups/campus-groovelab}/"
fi

# 3. Alte lokale Backups bereinigen (Retention Policy)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bereinige lokale Backups älter als ${RETENTION_DAYS} Tage..."
find "${BACKUP_DIR}" -type f \( -name "dump_*.sql.gz.age*" -o -name "dump_*.sql.gz.gpg*" \) -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup-Prozess erfolgreich abgeschlossen."
