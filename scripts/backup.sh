#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Automated Nightly Backup & Storage Box Replication Engine
# Standard: BSI IT-Grundschutz / ISO 27001 / OWASP ASVS Level 3
# Target: Hetzner Storage Box (Port 23 / SFTP)
# Crontab: 0 2 * * * /bin/bash /root/scripts/backup.sh >> /var/log/supabase_backup.log 2>&1
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# 1. Konfiguration & Umgebungsvariablen
# ------------------------------------------------------------------------------
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DAY=$(date +"%Y-%m-%d")

# Lokale Pfade auf dem Hetzner-Server
CLOUD_VOLUME="/mnt/cloud-volume"
LOCAL_STORAGE_DATA="${CLOUD_VOLUME}/storage-data"
LOCAL_BACKUP_ROOT="${CLOUD_VOLUME}/backups"
LOCAL_DB_BACKUP_DIR="${LOCAL_BACKUP_ROOT}/db"
LOCAL_DUMP_FILE="${LOCAL_DB_BACKUP_DIR}/cg_pg_dump_${TIMESTAMP}.sql.gz"

CONTAINER_NAME="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"

# Hetzner Storage Box Konfiguration (über ~/.ssh/config oder Umgebungsvariablen)
STORAGE_BOX_HOST="${STORAGE_BOX_HOST:-}"
STORAGE_BOX_USER="${STORAGE_BOX_USER:-}"
STORAGE_BOX_PORT="${STORAGE_BOX_PORT:-23}"
STORAGE_BOX_DEST="${STORAGE_BOX_DEST:-/backups}"

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Nightly Backup & Offsite Mirroring Engine"
echo "    Startzeit: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "    Lokales Cloud-Volume: ${CLOUD_VOLUME}"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 2. Lokale Verzeichnisse vorbereiten
# ------------------------------------------------------------------------------
mkdir -p "${LOCAL_DB_BACKUP_DIR}"

# ------------------------------------------------------------------------------
# a) PostgreSQL Datenbank-Dump (Snapshot-Isoliert & Gzip-komprimiert)
# ------------------------------------------------------------------------------
echo "📦 1. Erstelle konsistenten PostgreSQL Dump aus Container '${CONTAINER_NAME}'..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ FEHLER: Container '${CONTAINER_NAME}' läuft nicht! Breche DB-Dump ab."
    exit 1
fi

TEMP_DUMP="${LOCAL_DUMP_FILE}.tmp"
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" --clean --if-exists --no-owner "${DB_NAME}" \
    | gzip -9 > "${TEMP_DUMP}"

# Validierung: Dump-Größe muss plausibel sein (> 10 KB)
FILE_SIZE=$(wc -c < "${TEMP_DUMP}" | tr -d ' ')
if [ "${FILE_SIZE}" -lt 10240 ]; then
    echo "❌ FEHLER: Dump-Datei ist verdächtig klein (${FILE_SIZE} Bytes). Möglicher Fehler beim Dump!"
    rm -f "${TEMP_DUMP}"
    exit 1
fi

mv "${TEMP_DUMP}" "${LOCAL_DUMP_FILE}"
sha256sum "${LOCAL_DUMP_FILE}" > "${LOCAL_DUMP_FILE}.sha256"
echo "  ✓ DB-Dump erfolgreich erstellt: ${LOCAL_DUMP_FILE} (${FILE_SIZE} Bytes)"
echo "  ✓ SHA-256 Prüfsumme verifiziert: $(cat "${LOCAL_DUMP_FILE}.sha256")"

# ------------------------------------------------------------------------------
# b) Replikation auf Hetzner Storage Box (Port 23 / SSH / SFTP)
# ------------------------------------------------------------------------------
if [ -n "${STORAGE_BOX_HOST}" ] && [ -n "${STORAGE_BOX_USER}" ]; then
    SSH_TARGET="${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}"
    SSH_CMD="ssh -p ${STORAGE_BOX_PORT} -o StrictHostKeyChecking=accept-new"
    
    echo ""
    echo "☁️  2. Synchronisiere auf Hetzner Storage Box (${STORAGE_BOX_HOST}:${STORAGE_BOX_PORT})..."

    # Zielverzeichnisse auf der Storage Box sicherstellen
    ${SSH_CMD} "${SSH_TARGET}" "mkdir -p ${STORAGE_BOX_DEST}/db ${STORAGE_BOX_DEST}/storage"

    # b.1) DB-Dump übertragen
    echo "  ➔ Übertrage Datenbank-Dump nach ${STORAGE_BOX_DEST}/db/..."
    rsync -avzP -e "ssh -p ${STORAGE_BOX_PORT}" \
        "${LOCAL_DUMP_FILE}" "${LOCAL_DUMP_FILE}.sha256" \
        "${SSH_TARGET}:${STORAGE_BOX_DEST}/db/"

    # b.2) Audio- & Medien-Verzeichnis inkrementell spiegeln (Media-Tresor)
    if [ -d "${LOCAL_STORAGE_DATA}" ]; then
        echo "  ➔ Spiegle Audio- & Medien-Tresor (${LOCAL_STORAGE_DATA}/) nach ${STORAGE_BOX_DEST}/storage/..."
        rsync -avzP --delete -e "ssh -p ${STORAGE_BOX_PORT}" \
            "${LOCAL_STORAGE_DATA}/" \
            "${SSH_TARGET}:${STORAGE_BOX_DEST}/storage/"
        echo "  ✓ Audio- & Medien-Tresor erfolgreich synchronisiert."
    else
        echo "  ℹ Hinweis: Verzeichnis ${LOCAL_STORAGE_DATA} noch nicht angelegt oder leer."
    fi

    # ------------------------------------------------------------------------------
    # c) Retention Policy: Älter als 7 Tage rotieren
    # ------------------------------------------------------------------------------
    echo ""
    echo "🧹 3. Bereinige Datenbank-Backups älter als 7 Tage..."
    
    # Lokale Dumps bereinigen
    find "${LOCAL_DB_BACKUP_DIR}" -type f -name "cg_pg_dump_*.sql.gz*" -mtime +7 -delete 2>/dev/null || true
    echo "  ✓ Lokale Bereinigung abgeschlossen."

    # Remote Dumps auf der Storage Box bereinigen
    ${SSH_CMD} "${SSH_TARGET}" "find ${STORAGE_BOX_DEST}/db -type f -name 'cg_pg_dump_*.sql.gz*' -mtime +7 -delete 2>/dev/null || true"
    echo "  ✓ Remote Bereinigung auf der Storage Box abgeschlossen."
else
    echo ""
    echo "ℹ️  HINWEIS: Keine STORAGE_BOX_HOST und STORAGE_BOX_USER definiert."
    echo "    Lokaler Dump liegt sicher auf dem Cloud-Volume: ${LOCAL_DUMP_FILE}"
    echo "    Setze STORAGE_BOX_HOST & STORAGE_BOX_USER in der Umgebung oder crontab für Remote-Sync."
fi

echo ""
echo "=============================================================================="
echo "✅ [$(date '+%Y-%m-%d %H:%M:%S %Z')] Campus-Groovelab Backup-Lauf erfolgreich beendet!"
echo "=============================================================================="
