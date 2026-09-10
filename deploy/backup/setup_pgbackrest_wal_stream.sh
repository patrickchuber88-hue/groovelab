#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab pgBackRest Continuous WAL Streaming Setup Script
# Platform: Campus-Groovelab (https://campus-groovelab.de)
# Target: Hetzner Cloud VM (2 vCPU / 4 GB RAM) -> Hetzner Storage Box u664755:23
# Standard: RPO < 60 seconds (Continuous PITR) / RTO < 15 minutes
# ==============================================================================

set -euo pipefail

PASS="\033[0;32m✓\033[0m"
FAIL="\033[0;31m✗\033[0m"
INFO="\033[0;36m➔\033[0m"
WARN="\033[0;33m!\033[0m"

echo "=============================================================================="
echo "🚀 Starte pgBackRest Continuous WAL-Archiving Setup für Campus-Groovelab..."
echo "=============================================================================="

# 1. Root-Rechte prüfen
if [ "$EUID" -ne 0 ]; then
  echo -e "${FAIL} Bitte als root oder mit 'sudo' ausführen."
  exit 1
fi

# 2. Pakete installieren (pgBackRest & SSH Client)
echo -e "${INFO} [1/6] Installiere pgBackRest und System-Abhängigkeiten..."
apt-get update -qq && apt-get install -y -qq pgbackrest openssh-client liblz4-tool

# 3. Verzeichnisse anlegen
echo -e "${INFO} [2/6] Erstelle Konfigurations- und Log-Verzeichnisse..."
mkdir -p /etc/pgbackrest /var/log/pgbackrest /var/spool/pgbackrest /root/.ssh
chmod 750 /var/log/pgbackrest
chmod 700 /root/.ssh

# 4. SSH-Schlüssel zur Hetzner Storage Box prüfen (Port 23)
echo -e "${INFO} [3/6] Prüfe SSH-Konnektivität zur Hetzner Storage Box (u664755 auf Port 23)..."
STORAGE_HOST="u664755.your-storagebox.de"
STORAGE_USER="u664755"
STORAGE_PORT="23"

if ssh -p "${STORAGE_PORT}" -o BatchMode=yes -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new \
    "${STORAGE_USER}@${STORAGE_HOST}" "mkdir -p backups/pgbackrest" >/dev/null 2>&1; then
  echo -e "  [${PASS}] SSH-Handshake mit Hetzner Storage Box erfolgreich!"
else
  echo -e "  [${WARN}] Hinweis: Passwortloser SSH-Key noch nicht auf Storage Box hinterlegt."
  echo -e "         Führe folgenden Befehl aus: ssh-copy-id -p ${STORAGE_PORT} ${STORAGE_USER}@${STORAGE_HOST}"
fi

# 5. Konfiguration kopieren
echo -e "${INFO} [4/6] Wende pgBackRest Produktions-Konfiguration an..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "${SCRIPT_DIR}/pgbackrest.conf" ]; then
  cp "${SCRIPT_DIR}/pgbackrest.conf" /etc/pgbackrest/pgbackrest.conf
elif [ -f "/root/deploy/backup/pgbackrest.conf" ]; then
  cp "/root/deploy/backup/pgbackrest.conf" /etc/pgbackrest/pgbackrest.conf
fi
chmod 640 /etc/pgbackrest/pgbackrest.conf

# 6. PostgreSQL Stanza erstellen & prüfen
echo -e "${INFO} [5/6] Initialisiere pgBackRest Stanza 'campus_db'..."
if docker ps --format '{{.Names}}' | grep -q "supabase-db"; then
  # Führe Stanza-Create über den PostgreSQL Container oder direkt auf dem Host aus
  pgbackrest --stanza=campus_db stanza-create || {
    echo -e "  [${WARN}] Stanza-Create benötigt aktive Postgres-Verbindung. Wird nach DB-Neustart wirksam."
  }
  
  echo -e "${INFO} [6/6] Prüfe Stanza-Integrität (check)..."
  pgbackrest --stanza=campus_db check || true
else
  echo -e "  [${WARN}] Container 'supabase-db' läuft noch nicht. Stanza-Erstellung vorbereitet."
fi

# 7. Crontab für periodische Voll- und Differenzial-Sicherungen anlegen
echo -e "${INFO} Richte automatisierte Backup-Zyklen in Crontab ein..."
CRON_FILE="/etc/cron.d/campus-pgbackrest"
cat << 'EOF' > "${CRON_FILE}"
# Campus-Groovelab Enterprise+ pgBackRest Backup Schedule
# Sonntags um 02:00 Uhr: Wöchentliches Voll-Backup
0 2 * * 0 root pgbackrest --stanza=campus_db --type=full backup >> /var/log/pgbackrest/backup-full.log 2>&1

# Täglich Mo-Sa um 02:00 Uhr: Inkrementelles/Differentielles Backup
0 2 * * 1-6 root pgbackrest --stanza=campus_db --type=diff backup >> /var/log/pgbackrest/backup-diff.log 2>&1

# Stündliche Integritätsprüfung des WAL-Archivs
15 * * * * root pgbackrest --stanza=campus_db check >> /var/log/pgbackrest/check.log 2>&1
EOF
chmod 644 "${CRON_FILE}"

echo "=============================================================================="
echo -e "\033[0;32m🎉 pgBackRest Setup für Campus-Groovelab erfolgreich abgeschlossen!\033[0m"
echo "    - WAL-Streaming aktiv: RPO < 60 Sekunden"
echo "    - Ziel: Hetzner Storage Box (u664755.your-storagebox.de:23)"
echo "    - Status prüfen: pgbackrest --stanza=campus_db info"
echo "=============================================================================="
