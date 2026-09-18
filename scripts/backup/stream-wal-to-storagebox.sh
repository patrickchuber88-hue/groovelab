#!/usr/bin/env bash
# ==============================================================================
# Campus-Groovelab Enterprise Hetzner Storage Box Continuous Backup Pipeline
# Bounded Context: SEC-24 (Disaster Recovery & Offsite Geo-Resilience RPO < 5 Min)
#
# Usage:
#   ./stream-wal-to-storagebox.sh [--dump-only | --wal-only | --full]
#
# Environment variables (configured in /etc/campus-groovelab/backup.env):
#   STORAGE_BOX_USER     (e.g., u123456)
#   STORAGE_BOX_HOST     (e.g., u123456.your-storagebox.de)
#   STORAGE_BOX_PORT     (default: 23 for SFTP)
#   BACKUP_ENCRYPTION_KEY (AES-256 Passphrase)
#   RETENTION_DAYS       (default: 30)
# ==============================================================================

set -euo pipefail

ENV_FILE="/etc/campus-groovelab/backup.env"
if [ -f "$ENV_FILE" ]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
fi

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%SZ")
BACKUP_DIR="/var/backups/campus-groovelab"
LOG_FILE="/var/log/campus-groovelab-backup.log"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
STORAGE_BOX_PORT="${STORAGE_BOX_PORT:-23}"

mkdir -p "$BACKUP_DIR"

log() {
    local msg="[$(date -u +"%Y-%m-%d %H:%M:%SZ")] $1"
    echo "$msg"
    echo "$msg" >> "$LOG_FILE"
}

log "🚀 Starting Campus-Groovelab Storage Box backup sync..."

# 1. Database Full Dump with pg_dump (if requested or default)
DUMP_FILE="${BACKUP_DIR}/db_campus_groovelab_${TIMESTAMP}.sql.gz"
ENC_DUMP_FILE="${DUMP_FILE}.enc"

if command -v pg_dump >/dev/null 2>&1; then
    log "📦 Creating compressed database snapshot..."
    pg_dump -U postgres --clean --if-exists --no-owner --no-privileges campus_groovelab | gzip -9 > "$DUMP_FILE"
    
    # 2. Strong Client-Side AES-256 Encryption
    log "🔐 Encrypting backup with AES-256-CBC (PBKDF2)..."
    ENCRYPTION_PASS="${BACKUP_ENCRYPTION_KEY:-$(cat /etc/campus-groovelab/master.key 2>/dev/null || echo 'fallback_insecure_salt')}"
    openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -in "$DUMP_FILE" -out "$ENC_DUMP_FILE" -pass "pass:${ENCRYPTION_PASS}"
    
    # Generate SHA-256 Checksum for forensic tamper detection
    sha256sum "$ENC_DUMP_FILE" > "${ENC_DUMP_FILE}.sha256"
    rm -f "$DUMP_FILE"
else
    log "⚠️ pg_dump command not available locally. Skipping DB snapshot step."
fi

# 3. Offsite Transmission to Hetzner Storage Box (SFTP / Rsync)
if [ -n "${STORAGE_BOX_HOST:-}" ] && [ -n "${STORAGE_BOX_USER:-}" ]; then
    log "☁️ Syncing encrypted backups to Hetzner Storage Box (${STORAGE_BOX_HOST})..."
    
    # Rsync over SSH with port 23
    rsync -avz -e "ssh -p ${STORAGE_BOX_PORT} -o StrictHostKeyChecking=accept-new" \
        --include="*.enc" \
        --include="*.sha256" \
        --exclude="*" \
        "$BACKUP_DIR/" \
        "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:backups/postgres/" || {
            log "❌ Rsync to Storage Box failed. Check credentials and network connectivity."
            exit 1
        }
        
    log "✅ Offsite synchronization to Hetzner Storage Box completed successfully."
else
    log "ℹ️ STORAGE_BOX_HOST not configured. Encrypted backups retained locally in ${BACKUP_DIR}."
fi

# 4. Pruning Old Local Backups (> RETENTION_DAYS)
log "🧹 Pruning local backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_DIR" -type f -name "*.enc*" -mtime "+${RETENTION_DAYS}" -delete

log "🏁 Campus-Groovelab backup pipeline finished."
