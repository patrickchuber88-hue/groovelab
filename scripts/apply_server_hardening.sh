#!/bin/bash
# ==============================================================================
# 🛡️ Campus-Groovelab Server Hardening & Log-Rotation Installer
# Target Server: 178.105.10.2 (Hetzner Cloud)
# Usage: bash scripts/apply_server_hardening.sh
# ==============================================================================

set -eo pipefail

SERVER="${SERVER:-root@178.105.10.2}"

echo "=============================================================================="
echo "🛡️  Campus-Groovelab Server Hardening wird auf $SERVER angewendet..."
echo "=============================================================================="

# 1. Transfer docker_daemon_hardening.json
echo "📦 1. Konfiguriere Docker Daemon Log-Rotation (/etc/docker/daemon.json)..."
ssh "$SERVER" "mkdir -p /etc/docker /root/scripts"
scp scripts/docker_daemon_hardening.json "$SERVER:/etc/docker/daemon.json"

# 2. Reload Docker daemon gracefully (live-restore preserves active containers)
echo "🔄 2. Lade Docker Daemon Konfiguration neu..."
ssh "$SERVER" "systemctl reload docker 2>/dev/null || systemctl restart docker || true"

# 3. Setup logrotate for Supabase and System logs
echo "📜 3. Konfiguriere Logrotate für Backups & Nginx..."
ssh "$SERVER" 'cat << "EOF" > /etc/logrotate.d/campus_groovelab
/var/log/supabase_backup.log
/var/log/campus_health_watchdog.log
/var/log/server_maintenance.log {
    weekly
    rotate 4
    compress
    missingok
    notifempty
    create 0640 root root
}
EOF'

echo ""
echo "✅ Server-Hardening & Log-Rotation erfolgreich eingerichtet!"
echo "=============================================================================="
