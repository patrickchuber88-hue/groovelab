#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Enterprise+ Automated Encrypted Backup Script
# Location: /usr/local/bin/backup_campus_db.sh
# Standard: BSI IT-Grundschutz & DSGVO Art. 32 (Verschlüsselte Offsite-Sicherung)
# ==============================================================================

set -euo pipefail

# ── Konfiguration ──
BACKUP_DIR="/var/backups/campus-groovelab"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DAY=$(date +"%Y-%m-%d")
DB_CONTAINER="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"
ENCRYPTION_PASSPHRASE="${CAMPUS_BACKUP_PASSPHRASE:-ChangeMeSecurePassphrase2026}"
RETENTION_DAYS=14

# Storage Box Offsite Konfiguration (Optional)
# STORAGE_BOX_USER="u123456"
# STORAGE_BOX_HOST="u123456.your-storagebox.de"
# STORAGE_BOX_PORT="23"
# STORAGE_BOX_DEST="/home/backups/campus-groovelab"

mkdir -p "${BACKUP_DIR}"

RAW_BACKUP="${BACKUP_DIR}/dump_${TIMESTAMP}.sql.gz"
ENCRYPTED_BACKUP="${RAW_BACKUP}.gpg"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starte verschlüsseltes Backup für Campus-Groovelab..."

# 1. PostgreSQL Dump aus Docker-Container ziehen und komprimieren
docker exec -t "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip -9 > "${RAW_BACKUP}"

# 2. AES-256 Verschlüsselung anwenden
echo "${ENCRYPTION_PASSPHRASE}" | gpg --batch --yes --passphrase-fd 0 --symmetric --cipher-algo AES256 -o "${ENCRYPTED_BACKUP}" "${RAW_BACKUP}"

# 3. Unverschlüsseltes Roh-Backup sofort sicher löschen (Shredder / Remove)
rm -f "${RAW_BACKUP}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Verschlüsseltes Backup erfolgreich erstellt: ${ENCRYPTED_BACKUP}"

# 4. Offsite-Replikation zur Hetzner Storage Box (falls konfiguriert)
if [ -n "${STORAGE_BOX_USER:-}" ] && [ -n "${STORAGE_BOX_HOST:-}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Repliziere Backup zur Hetzner Storage Box..."
    rsync -avz -e "ssh -p ${STORAGE_BOX_PORT}" "${ENCRYPTED_BACKUP}" "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_DEST}/"
fi

# 5. Alte lokale Backups bereinigen (Retention Policy)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bereinige lokale Backups älter als ${RETENTION_DAYS} Tage..."
find "${BACKUP_DIR}" -type f -name "dump_*.sql.gz.gpg" -mtime +"${RETENTION_DAYS}" -delete

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup-Prozess erfolgreich abgeschlossen."
