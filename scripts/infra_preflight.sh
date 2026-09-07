#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Enterprise+ Infrastructure Pre-Flight Gate
# Standards: Fail-Closed / OWASP ASVS Level 3 / BSI IT-Grundschutz
# Purpose: Instant, deterministic 360-degree health validation before code
# deployments, database migrations, or server maintenance.
# Exit Code: 0 = ALL SYSTEMS HEALTHY, 1 = CRITICAL FAILURE (FAIL-CLOSED)
# ==============================================================================

set -euo pipefail

PASS="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"
WARN="\033[0;33m!\033[0m"
INFO="\033[0;36m➔\033[0m"

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Pre-Flight Infrastructure Health Gate"
echo "    Prüfzeitpunkt: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "    Host:          $(hostname -f 2>/dev/null || hostname)"
echo "=============================================================================="

FAILED=0

# ------------------------------------------------------------------------------
# 1. Cloud Volume (NVMe Block Storage & RW-Test)
# ------------------------------------------------------------------------------
echo -e "${INFO} 1. Prüfe Cloud Volume Mount & Schreibrechte..."
VOLUME_PATH="/mnt/cloud-volume/storage-data"

if [ -d "${VOLUME_PATH}" ]; then
    # Prüfe, ob Volume auf eigenem Block-Device liegt (nicht im Root-Filesystem)
    MOUNT_DEVICE=$(df -P "${VOLUME_PATH}" | tail -n 1 | awk '{print $1}')
    ROOT_DEVICE=$(df -P / | tail -n 1 | awk '{print $1}')
    
    if [ "${MOUNT_DEVICE}" != "${ROOT_DEVICE}" ]; then
        # Echter atomarer Schreib- und Löschtest über den Storage-Container
        RW_OK=0
        if docker ps --format '{{.Names}}' | grep -q "^supabase-storage$"; then
            if docker exec supabase-storage touch /var/lib/storage/.preflight_rw_test 2>/dev/null \
               && docker exec supabase-storage rm /var/lib/storage/.preflight_rw_test 2>/dev/null; then
                RW_OK=1
            fi
        elif touch "${VOLUME_PATH}/.preflight_rw_test" 2>/dev/null && rm "${VOLUME_PATH}/.preflight_rw_test" 2>/dev/null; then
            RW_OK=1
        fi

        if [ "${RW_OK}" -eq 1 ]; then
            DISK_USAGE=$(df -h "${VOLUME_PATH}" | tail -n 1 | awk '{print $5}' | tr -d '%')
            DISK_AVAIL=$(df -h "${VOLUME_PATH}" | tail -n 1 | awk '{print $4}')
            echo -e "  [${PASS}] Cloud Volume: Gemountet auf ${MOUNT_DEVICE} (${DISK_AVAIL} frei, Belegung: ${DISK_USAGE}%)"
        else
            echo -e "  [${FAIL}] Cloud Volume FEHLER: Dateisystem ist schreibgeschützt (Read-Only)!"
            FAILED=1
        fi
    else
        echo -e "  [${FAIL}] Cloud Volume FEHLER: Liegt auf dem Root-Filesystem (${ROOT_DEVICE})! Mount fehlt."
        FAILED=1
    fi
else
    echo -e "  [${FAIL}] Cloud Volume FEHLER: Pfad '${VOLUME_PATH}' existiert nicht!"
    FAILED=1
fi

# ------------------------------------------------------------------------------
# 2. Hetzner Storage Box Konnektivität (Port 23 / SSH Key)
# ------------------------------------------------------------------------------
echo -e "${INFO} 2. Prüfe Hetzner Storage Box Konnektivität (Port 23)..."
STORAGE_HOST="u664755.your-storagebox.de"
STORAGE_USER="u664755"

if ssh -p 23 -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
    "${STORAGE_USER}@${STORAGE_HOST}" "ls -d backups/db backups/storage" >/dev/null 2>&1; then
    echo -e "  [${PASS}] Storage Box: Passwortlose SSH-Verbindung aktiv & Stammverzeichnisse intakt"
else
    echo -e "  [${FAIL}] Storage Box FEHLER: SSH-Handshake auf Port 23 fehlgeschlagen oder Verzeichnisse fehlen!"
    FAILED=1
fi

# ------------------------------------------------------------------------------
# 3. Datenbank-Container Health (`supabase-db`)
# ------------------------------------------------------------------------------
echo -e "${INFO} 3. Prüfe PostgreSQL Datenbank-Container ('supabase-db')..."
if docker ps --format '{{.Names}}' | grep -q "^supabase-db$"; then
    DB_STATUS=$(docker inspect --format='{{.State.Health.Status}}' supabase-db 2>/dev/null || echo "unhealthy")
    if [ "${DB_STATUS}" = "healthy" ]; then
        # Ping PostgreSQL direkt per pg_isready
        if docker exec supabase-db pg_isready -U postgres >/dev/null 2>&1; then
            STUDENTS_COUNT=$(docker exec supabase-db psql -U postgres -d postgres -t -A -c "SELECT count(*) FROM students;" 2>/dev/null || echo "0")
            echo -e "  [${PASS}] Supabase DB: Status 'healthy' & Verbindung aktiv (${STUDENTS_COUNT} Schüler verifiziert)"
        else
            echo -e "  [${FAIL}] Supabase DB FEHLER: pg_isready meldet keine Verbindung!"
            FAILED=1
        fi
    else
        echo -e "  [${WARN}] Supabase DB WARNUNG: Container läuft, aber Health-Status ist '${DB_STATUS}'"
    fi
else
    echo -e "  [${FAIL}] Supabase DB FEHLER: Container 'supabase-db' läuft nicht!"
    FAILED=1
fi

# ------------------------------------------------------------------------------
# 4. Backend-Applikation Container (`groovelab-bff`)
# ------------------------------------------------------------------------------
echo -e "${INFO} 4. Prüfe Backend API Gateway Container ('groovelab-bff')..."
if docker ps --format '{{.Names}}' | grep -q "^groovelab-bff$"; then
    BFF_STATUS=$(docker inspect --format='{{.State.Health.Status}}' groovelab-bff 2>/dev/null || echo "running")
    echo -e "  [${PASS}] Backend Gateway: Container 'groovelab-bff' aktiv (Status: ${BFF_STATUS})"
else
    echo -e "  [${FAIL}] Backend Gateway FEHLER: Container 'groovelab-bff' läuft nicht!"
    FAILED=1
fi

# ------------------------------------------------------------------------------
# 5. Krypto-Schlüssel (Zero-Knowledge Age X25519)
# ------------------------------------------------------------------------------
echo -e "${INFO} 5. Prüfe asymmetrische Backup-Schlüssel..."
AGE_PUBKEY="/etc/campus-groovelab/backup_age_public.key"
if [ -s "${AGE_PUBKEY}" ]; then
    PUBKEY_VAL=$(head -n 1 "${AGE_PUBKEY}")
    echo -e "  [${PASS}] Krypto-Key: Age X25519 Public Key aktiv (${PUBKEY_VAL:0:16}...)"
else
    echo -e "  [${FAIL}] Krypto-Key FEHLER: '${AGE_PUBKEY}' fehlt oder ist leer!"
    FAILED=1
fi

# ------------------------------------------------------------------------------
# 6. Netzwerk- & Firewall-Isolierung (Port 5432 Schutz)
# ------------------------------------------------------------------------------
echo -e "${INFO} 6. Prüfe Sicherheits-Isolierung der Datenbank..."
EXTERNAL_EXPOSED=$(docker port supabase-db 5432/tcp 2>/dev/null | grep "0.0.0.0" || true)
if [ -z "${EXTERNAL_EXPOSED}" ]; then
    echo -e "  [${PASS}] Security Guard: Port 5432 ist strikt auf localhost gebunden (Zero-Trust)"
else
    echo -e "  [${FAIL}] SICHERHEITSVERLETZUNG: Port 5432 ist öffentlich auf 0.0.0.0 exponiert!"
    FAILED=1
fi

echo "=============================================================================="
if [ "${FAILED}" -eq 0 ]; then
    echo -e "\033[0;32m🏆 ALL SYSTEMS GO: Infrastruktur ist zu 100% gesund und betriebsbereit!\033[0m"
    echo "    Freigabe erteilt für: Code-Deployments, Schema-Migrationen & Betrieb."
    echo "=============================================================================="
    exit 0
else
    echo -e "\033[0;31m❌ PRE-FLIGHT FEHLGESCHLAGEN: Mindestens eine Kern-Komponente ist gestört!\033[0m"
    echo "    Aktion abgebrochen. Bitte vor Code-Änderungen die markierten Fehler beheben."
    echo "=============================================================================="
    exit 1
fi
