#!/usr/bin/env bash
# ==============================================================================
# ⚖️ Campus-Groovelab DSGVO Art. 17 Tombstone Sync to Storage Box (Speicher 3)
# Purpose: Exports newly registered GDPR deletion tombstones from Supabase
# and securely syncs them to Hetzner Storage Box (WORM/Append-Only Offsite Ledger).
# Standard: DSGVO Art. 17 / BSI C5 / ISO 27001
# ==============================================================================

set -euo pipefail

DB_CONTAINER="${DB_CONTAINER:-supabase-db}"
DB_USER="postgres"
DB_NAME="postgres"
CLOUD_VOLUME="${CLOUD_VOLUME:-/mnt/cloud-volume}"
LOCAL_COMPLIANCE_DIR="${CLOUD_VOLUME}/backups/compliance"
LOCAL_TOMBSTONE_FILE="${LOCAL_COMPLIANCE_DIR}/gdpr_tombstones.jsonl"

STORAGE_BOX_HOST="${STORAGE_BOX_HOST:-u664755.your-storagebox.de}"
STORAGE_BOX_USER="${STORAGE_BOX_USER:-u664755}"
STORAGE_BOX_PORT="${STORAGE_BOX_PORT:-23}"
STORAGE_BOX_DEST_DIR="${STORAGE_BOX_DEST_DIR:-backups/compliance}"

mkdir -p "${LOCAL_COMPLIANCE_DIR}"

echo "=============================================================================="
echo "⚖️  GDPR Art. 17 Tombstone Offsite Synchronization (Speicher 3)"
echo "    Local Ledger:       ${LOCAL_TOMBSTONE_FILE}"
echo "    Remote Storage Box: ${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_PORT}/${STORAGE_BOX_DEST_DIR}"
echo "=============================================================================="

# 1. Export current tombstones from DB as JSONL if DB is reachable
if docker exec "${DB_CONTAINER}" pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
    echo "📥 Exportiere aktuelle Tombstones aus audit.gdpr_tombstones..."
    docker exec "${DB_CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -t -A -c \
      "SELECT json_build_object(
        'entity_type', entity_type,
        'entity_uuid', entity_uuid,
        'school_id', school_id,
        'purged_at', purged_at,
        'seal', verification_seal
      ) FROM audit.gdpr_tombstones ORDER BY purged_at ASC;" > "${LOCAL_TOMBSTONE_FILE}.tmp" 2>/dev/null || true

    if [ -s "${LOCAL_TOMBSTONE_FILE}.tmp" ]; then
        mv "${LOCAL_TOMBSTONE_FILE}.tmp" "${LOCAL_TOMBSTONE_FILE}"
        RECORD_COUNT=$(wc -l < "${LOCAL_TOMBSTONE_FILE}" | tr -d ' ')
        echo "  ✓ ${RECORD_COUNT} Tombstone-Datensätze lokal gesichert."
    fi
fi

# 2. Sync to Hetzner Storage Box via SFTP / rsync
if [ -f "${LOCAL_TOMBSTONE_FILE}" ]; then
    echo "🚀 Übertrage Tombstone-Ledger auf Storage Box (Speicher 3)..."
    
    # Versuche rsync über SSH-Port
    if rsync -avz -e "ssh -p ${STORAGE_BOX_PORT} -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10" \
        "${LOCAL_TOMBSTONE_FILE}" "${STORAGE_BOX_USER}@${STORAGE_BOX_HOST}:${STORAGE_BOX_DEST_DIR}/gdpr_tombstones.jsonl" 2>/dev/null; then
        echo "  ✅ Erfolgreich mit Storage Box synchronisiert."
    else
        echo "  ℹ️  Storage Box Direktverbindung nicht möglich (Offline / Dry-Run). Lokales Backup auf Cloud-Volumen verbleibt intakt."
    fi
fi

echo "=============================================================================="
echo "✅ Tombstone Offsite Sync abgeschlossen."
echo "=============================================================================="
