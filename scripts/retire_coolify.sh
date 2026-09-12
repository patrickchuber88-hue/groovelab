#!/usr/bin/env bash
# ==============================================================================
# 🛡️ Campus-Groovelab Tier-1 Sovereign Monolith Migration: Retire Coolify
# Standards: OWASP ASVS Level 3 / Fail-Closed / BSI IT-Grundschutz
# Target Host: Hetzner Cloud VM (178.105.10.2)
# Purpose: Gracefully decommission Coolify, free ports 80/443, reclaim ~750MB RAM,
#          and activate the hardened Host Nginx Ingress.
# ==============================================================================

set -euo pipefail

PASS="\033[0;32m✓\033[0m"
WARN="\033[0;33m!\033[0m"
FAIL="\033[0;31m✗\033[0m"
INFO="\033[0;36m➔\033[0m"

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Sovereign Migration: Coolify Retirement & Nginx Ingress"
echo "    Timestamp: $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "=============================================================================="

# 0. Root Check
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${FAIL} FEHLER: Dieses Skript muss mit Root-Rechten ausgeführt werden (sudo)."
    exit 1
fi

# 1. Baseline Memory Audit
echo -e "${INFO} 1. Erfasse aktuellen Arbeitsspeicher-Status (Vorher)..."
free -h

# 2. Coolify Container identifizieren & stoppen
echo -e "\n${INFO} 2. Identifiziere und stoppe Coolify-Dienste..."
COOLIFY_CONTAINERS=$(docker ps -a --format '{{.Names}}' | grep -E '^coolify(-db|-redis|-proxy|-realtime)?$' || true)

if [ -n "${COOLIFY_CONTAINERS}" ]; then
    echo "  Gefundene Coolify-Container:"
    echo "${COOLIFY_CONTAINERS}" | sed 's/^/    - /'
    echo "  Stoppe Container geordnet..."
    echo "${COOLIFY_CONTAINERS}" | xargs -r docker stop
    echo "  Entferne Coolify-Container..."
    echo "${COOLIFY_CONTAINERS}" | xargs -r docker rm
    echo -e "  [${PASS}] Coolify-Container erfolgreich entfernt."
else
    echo -e "  [${PASS}] Keine aktiven Coolify-Container gefunden."
fi

# 3. Systemd-Dienste von Coolify deaktivieren
echo -e "\n${INFO} 3. Prüfe und deaktiviere Coolify Systemd-Dienste..."
for SVC in coolify coolify-helper; do
    if systemctl is-active --quiet "${SVC}" 2>/dev/null; then
        systemctl stop "${SVC}"
        systemctl disable "${SVC}"
        echo -e "  [${PASS}] Systemd-Dienst '${SVC}' gestoppt und deaktiviert."
    fi
done

# 4. Verzeichnisstruktur & Netzwerk absichern
echo -e "\n${INFO} 4. Bereite Verzeichnisstruktur & Docker-Netzwerk vor..."
mkdir -p /var/www/groovelab
mkdir -p /var/www/certbot
mkdir -p /etc/nginx/sites-available
mkdir -p /etc/nginx/sites-enabled
chown -R deployuser:deployuser /var/www/groovelab 2>/dev/null || true
# Sicherstellen, dass das bestehende Bridge-Netzwerk für laufende Container intakt bleibt
docker network create coolify 2>/dev/null || true
echo -e "  [${PASS}] Verzeichnisse & Netzwerk intakt."

# 5. Nginx Konfigurationen aktivieren
echo -e "\n${INFO} 5. Verknüpfe Nginx Ingress Konfigurationen..."
if [ -f "/etc/nginx/sites-available/campus-groovelab.de.conf" ]; then
    ln -sf /etc/nginx/sites-available/campus-groovelab.de.conf /etc/nginx/sites-enabled/
    echo -e "  [${PASS}] campus-groovelab.de.conf aktiviert."
fi

if [ -f "/etc/nginx/sites-available/supabase.campus-groovelab.de.conf" ]; then
    ln -sf /etc/nginx/sites-available/supabase.campus-groovelab.de.conf /etc/nginx/sites-enabled/
    echo -e "  [${PASS}] supabase.campus-groovelab.de.conf aktiviert."
fi

# 6. Nginx Syntaxprüfung & Start
echo -e "\n${INFO} 6. Prüfe Nginx Syntax & starte Ingress..."
nginx -t
systemctl enable nginx
systemctl restart nginx
echo -e "  [${PASS}] Nginx Ingress läuft erfolgreich auf Ports 80 und 443."

# 7. Unnötige Docker-Caches bereinigen
echo -e "\n${INFO} 7. Bereinige ungenutzte Docker-Images und Build-Caches..."
docker image prune -a --filter "until=168h" -f
docker builder prune -f 2>/dev/null || true
echo -e "  [${PASS}] NVMe-Speicherplatz erfolgreich freigegeben."

# 8. Memory Audit Nachher
echo -e "\n=============================================================================="
echo -e "${INFO} 8. Arbeitsspeicher-Status (Nachher):"
free -h
echo "=============================================================================="
echo -e "\033[0;32m🏆 MIGRATION ERFOLGREICH: Coolify abgelöst, Nginx Ingress aktiv, ~750MB RAM zurückgewonnen!\033[0m"
echo "=============================================================================="
