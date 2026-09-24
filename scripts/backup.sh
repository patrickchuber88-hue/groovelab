#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Tier-1 SaaS Enterprise+ Database & Storage Box Backup Engine
# Standard: BSI IT-Grundschutz / ISO 27001 / OWASP ASVS Level 3
# Cryptography: Age X25519 Asymmetric Zero-Knowledge Encryption + SHA-256 Seal
# Target: Hetzner Cloud Volume (Local) & Hetzner Storage Box Port 23 (Offsite)
# Crontab: 0 * * * * /bin/bash /home/deployuser/scripts/backup.sh >> /var/log/supabase_backup.log 2>&1
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# 1. Konfiguration & Umgebungsvariablen
# ------------------------------------------------------------------------------
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DATE_DAY=$(date +"%Y-%m-%d")
DAY_OF_WEEK=$(date +"%u")   # 1 = Montag, 7 = Sonntag
DAY_OF_MONTH=$(date +"%d")  # 01 - 31
CURRENT_HOUR=$(date +"%H")  # 00 - 23

# Lokale Pfade auf dem Hetzner-Server (Cloud Volume)
CLOUD_VOLUME="${CLOUD_VOLUME:-/mnt/cloud-volume}"
LOCAL_STORAGE_DATA="${CLOUD_VOLUME}/storage-data"
LOCAL_BACKUP_ROOT="${CLOUD_VOLUME}/backups"

# GFS Verzeichnisse
HOURLY_DIR="${LOCAL_BACKUP_ROOT}/hourly"
DAILY_DIR="${LOCAL_BACKUP_ROOT}/daily"
WEEKLY_DIR="${LOCAL_BACKUP_ROOT}/weekly"
MONTHLY_DIR="${LOCAL_BACKUP_ROOT}/monthly"

mkdir -p "${HOURLY_DIR}" "${DAILY_DIR}" "${WEEKLY_DIR}" "${MONTHLY_DIR}"

CONTAINER_NAME="supabase-db"
DB_USER="postgres"
DB_NAME="postgres"

# Asymmetrischer Age Public Key (Zero-Knowledge)
PUBLIC_KEY_FILE="${PUBLIC_KEY_FILE:-/etc/campus-groovelab/backup_age_public.key}"
if [ -f "${PUBLIC_KEY_FILE}" ]; then
    AGE_RECIPIENT=$(cat "${PUBLIC_KEY_FILE}" | tr -d ' \n\r')
else
    AGE_RECIPIENT="age1upgweqzpg4dggd5as4c0le4gd265hgfcmw0ptn5gajr7u9szwdwq7dtqca"
fi

# Hetzner Storage Box Konfiguration (Port 23 / SFTP)
STORAGE_BOX_HOST="${STORAGE_BOX_HOST:-u664755.your-storagebox.de}"
STORAGE_BOX_USER="${STORAGE_BOX_USER:-u664755}"
STORAGE_BOX_PORT="${STORAGE_BOX_PORT:-23}"
STORAGE_BOX_DEST="${STORAGE_BOX_DEST:-backups}"

# Monitoring & Alerting Konfiguration (Dead Man's Switch)
MONITORING_ENV="/etc/campus-groovelab/monitoring.env"
if [ -f "${MONITORING_ENV}" ]; then
    # shellcheck source=/dev/null
    source "${MONITORING_ENV}"
fi
HEALTHCHECK_BACKUP_URL="${HEALTHCHECK_BACKUP_URL:-}"
DISCORD_WEBHOOK_URL="${DISCORD_WEBHOOK_URL:-}"

send_alert() {
    local msg="$1"
    echo "🚨 ALERT: ${msg}" >&2
    if [ -n "${HEALTHCHECK_BACKUP_URL}" ]; then
        curl -fsS -m 10 --retry 3 "${HEALTHCHECK_BACKUP_URL}/fail" >/dev/null 2>&1 || true
    fi
    if [ -n "${DISCORD_WEBHOOK_URL}" ]; then
        curl -fsS -m 10 -H "Content-Type: application/json" -d "{\"content\":\"🚨 **Campus-Groovelab Backup Alert**: ${msg}\"}" "${DISCORD_WEBHOOK_URL}" >/dev/null 2>&1 || true
    fi
}

send_success() {
    if [ -n "${HEALTHCHECK_BACKUP_URL}" ]; then
        curl -fsS -m 10 --retry 3 "${HEALTHCHECK_BACKUP_URL}" >/dev/null 2>&1 || true
    fi
}

trap 'send_alert "Backup failed unexpectedly on line $LINENO"' ERR

if [ -n "${HEALTHCHECK_BACKUP_URL}" ]; then
    curl -fsS -m 10 --retry 3 "${HEALTHCHECK_BACKUP_URL}/start" >/dev/null 2>&1 || true
fi

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Tier-1 Enterprise+ Backup & Encryption Engine"
echo "    Startzeit:     $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "    Cloud-Volume:  ${CLOUD_VOLUME}"
echo "    Age Recipient: ${AGE_RECIPIENT}"
echo "    Storage Box:   ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PORT}"
echo "=============================================================================="

# ------------------------------------------------------------------------------
# 2. Transaktionssicherer Dump + Gzip + Asymmetrische Age-Verschlüsselung
# ------------------------------------------------------------------------------
echo "📦 1. Erstelle atomaren PostgreSQL Dump aus Container '${CONTAINER_NAME}'..."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ FEHLER: Container '${CONTAINER_NAME}' läuft nicht! Breche Backup ab."
    exit 1
fi

TARGET_HOURLY_DUMP="${HOURLY_DIR}/cg_db_${TIMESTAMP}.sql.gz.age"
TEMP_DUMP="${TARGET_HOURLY_DUMP}.tmp"

# Atomare Pipeline: pg_dump -> gzip-1 -> age (X25519) -> .tmp Datei (gzip-1 schützt vor 100% CPU-Spikes)
docker exec "${CONTAINER_NAME}" pg_dump -U "${DB_USER}" --clean --if-exists --no-owner "${DB_NAME}" \
    | gzip -1 \
    | age -r "${AGE_RECIPIENT}" > "${TEMP_DUMP}"

# Validierung: Mindestgröße prüfen (> 10 KB)
FILE_SIZE=$(wc -c < "${TEMP_DUMP}" | tr -d ' ')
if [ "${FILE_SIZE}" -lt 10240 ]; then
    echo "❌ FEHLER: Verschlüsselte Dump-Datei ist verdächtig klein (${FILE_SIZE} Bytes)!"
    rm -f "${TEMP_DUMP}"
    exit 1
fi

mv "${TEMP_DUMP}" "${TARGET_HOURLY_DUMP}"
sha256sum "${TARGET_HOURLY_DUMP}" > "${TARGET_HOURLY_DUMP}.sha256"

echo "  ✓ Stündlicher Dump erfolgreich verschlüsselt: ${TARGET_HOURLY_DUMP} (${FILE_SIZE} Bytes)"
echo "  ✓ SHA-256 Prüfsummensiegel: $(cat "${TARGET_HOURLY_DUMP}.sha256")"

# ------------------------------------------------------------------------------
# 3. GFS-Klassifizierung (Grandfather-Father-Son)
# ------------------------------------------------------------------------------
echo ""
echo "🗄️  2. Führe GFS-Einstufung durch..."

# Daily Archive: Täglich nachts zwischen 00:00 und 02:00 Uhr
if [ "${CURRENT_HOUR}" = "02" ] || [ "${CURRENT_HOUR}" = "00" ] || [ ! -d "${DAILY_DIR}/${DATE_DAY}" ]; then
    DAILY_TARGET="${DAILY_DIR}/cg_db_daily_${DATE_DAY}.sql.gz.age"
    if [ ! -f "${DAILY_TARGET}" ]; then
        cp -p "${TARGET_HOURLY_DUMP}" "${DAILY_TARGET}"
        cp -p "${TARGET_HOURLY_DUMP}.sha256" "${DAILY_TARGET}.sha256"
        echo "  ✓ Tägliches GFS-Backup archiviert: ${DAILY_TARGET}"
    fi
fi

# Weekly Archive: Jeden Sonntag um 02:00 Uhr
if [ "${DAY_OF_WEEK}" = "7" ] && ([ "${CURRENT_HOUR}" = "02" ] || [ "${CURRENT_HOUR}" = "00" ]); then
    WEEKLY_TARGET="${WEEKLY_DIR}/cg_db_weekly_${DATE_DAY}.sql.gz.age"
    if [ ! -f "${WEEKLY_TARGET}" ]; then
        cp -p "${TARGET_HOURLY_DUMP}" "${WEEKLY_TARGET}"
        cp -p "${TARGET_HOURLY_DUMP}.sha256" "${WEEKLY_TARGET}.sha256"
        echo "  ✓ Wöchentliches GFS-Backup archiviert: ${WEEKLY_TARGET}"
    fi
fi

# Monthly Archive: Am 1. jedes Monats
if [ "${DAY_OF_MONTH}" = "01" ] && ([ "${CURRENT_HOUR}" = "02" ] || [ "${CURRENT_HOUR}" = "00" ]); then
    MONTHLY_TARGET="${MONTHLY_DIR}/cg_db_monthly_${DATE_DAY}.sql.gz.age"
    if [ ! -f "${MONTHLY_TARGET}" ]; then
        cp -p "${TARGET_HOURLY_DUMP}" "${MONTHLY_TARGET}"
        cp -p "${TARGET_HOURLY_DUMP}.sha256" "${MONTHLY_TARGET}.sha256"
        echo "  ✓ Monatliches GoBD-Langzeitarchiv erstellt: ${MONTHLY_TARGET}"
    fi
fi

# ------------------------------------------------------------------------------
# 4. Offsite-Replikation auf Hetzner Storage Box (Port 23)
# ------------------------------------------------------------------------------
echo ""
echo "☁️  3. Starte Offsite-Spiegelung zur Hetzner Storage Box (Port ${STORAGE_BOX_PORT})..."

SSH_TARGET="${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}"
SSH_OPTS="-p ${STORAGE_BOX_PORT} -o StrictHostKeyChecking=accept-new -o BatchMode=yes -o ConnectTimeout=10"

# Prüfe, ob Storage Box per Key erreichbar ist (pwd im restricted shell)
if ssh ${SSH_OPTS} "${SSH_TARGET}" "pwd" &>/dev/null; then
    echo "  ✓ Storage Box SSH-Handshake erfolgreich."

    # Zielordner auf der Storage Box anlegen
    ssh ${SSH_OPTS} "${SSH_TARGET}" "mkdir -p ${STORAGE_BOX_DEST}/db/hourly ${STORAGE_BOX_DEST}/db/daily ${STORAGE_BOX_DEST}/db/weekly ${STORAGE_BOX_DEST}/db/monthly ${STORAGE_BOX_DEST}/storage"

    # 4.1 Synchronisiere Datenbank-Archive nach GFS-Stufen
    echo "  ➔ Synchronisiere verschlüsselte GFS-Dumps nach ${STORAGE_BOX_DEST}/db/..."
    rsync -avz --delete -e "ssh -p ${STORAGE_BOX_PORT}" \
        "${HOURLY_DIR}/" \
        "${SSH_TARGET}:${STORAGE_BOX_DEST}/db/hourly/"
    rsync -avz -e "ssh -p ${STORAGE_BOX_PORT}" \
        "${DAILY_DIR}/" \
        "${SSH_TARGET}:${STORAGE_BOX_DEST}/db/daily/"
    rsync -avz -e "ssh -p ${STORAGE_BOX_PORT}" \
        "${WEEKLY_DIR}/" \
        "${SSH_TARGET}:${STORAGE_BOX_DEST}/db/weekly/"
    rsync -avz -e "ssh -p ${STORAGE_BOX_PORT}" \
        "${MONTHLY_DIR}/" \
        "${SSH_TARGET}:${STORAGE_BOX_DEST}/db/monthly/"
    echo "  ✓ GFS-Archive erfolgreich zur Storage Box repliziert."

    # 4.2 Spiegle Medien-Tresor (/mnt/cloud-volume/storage-data) inkrementell
    if [ -d "${LOCAL_STORAGE_DATA}" ]; then
        echo "  ➔ Spiegle Medien-Tresor (${LOCAL_STORAGE_DATA}/) nach ${STORAGE_BOX_DEST}/storage/..."
        rsync -avz --delete -e "ssh -p ${STORAGE_BOX_PORT}" \
            "${LOCAL_STORAGE_DATA}/" \
            "${SSH_TARGET}:${STORAGE_BOX_DEST}/storage/"
        echo "  ✓ Medien-Tresor erfolgreich gespiegelt."
    fi
else
    echo "  ℹ️  Storage Box aktuell nicht erreichbar. Dumps verbleiben lokal auf Cloud Volume."
fi

# ------------------------------------------------------------------------------
# 5. Lokale Retention Pruning (Cloud Volume schonen)
# ------------------------------------------------------------------------------
echo ""
echo "🧹 4. Bereinige lokale Backups auf dem Cloud Volume..."
find "${HOURLY_DIR}"  -type f -name "*.sql.gz.age*" -mtime +1   -delete 2>/dev/null || true # 24 Stunden
find "${DAILY_DIR}"   -type f -name "*.sql.gz.age*" -mtime +14  -delete 2>/dev/null || true # 14 Tage lokal
find "${WEEKLY_DIR}"  -type f -name "*.sql.gz.age*" -mtime +60  -delete 2>/dev/null || true # 2 Monate lokal
find "${MONTHLY_DIR}" -type f -name "*.sql.gz.age*" -mtime +365 -delete 2>/dev/null || true # 1 Jahr lokal
echo "  ✓ Lokale Bereinigung abgeschlossen."

echo ""
echo "⚖️  5. Synchronisiere DSGVO Art. 17 Löschregister (Tombstones)..."
TOMBSTONE_FILE="${LOCAL_BACKUP_ROOT}/gdpr_tombstones.jsonl"
docker exec "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c \
    "SELECT json_build_object('record_id', record_id, 'table_name', table_name, 'deleted_at', created_at) FROM audit_logs WHERE action = 'DELETE';" 2>/dev/null > "${TOMBSTONE_FILE}.tmp" || true

if [ -f "${TOMBSTONE_FILE}.tmp" ]; then
    mv "${TOMBSTONE_FILE}.tmp" "${TOMBSTONE_FILE}"
    echo "  ✓ DSGVO-Löschregister aktualisiert: ${TOMBSTONE_FILE}"
fi

send_success

echo ""
echo "=============================================================================="
echo "✅ [$(date '+%Y-%m-%d %H:%M:%S %Z')] Tier-1 Backup-Lauf erfolgreich beendet!"
echo "=============================================================================="

exit 0
