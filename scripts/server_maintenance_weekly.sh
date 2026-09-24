#!/bin/bash
# ==============================================================================
# 🧹 Campus-Groovelab Automated Weekly Server Maintenance & Pruning Engine
# Platform: Campus-Groovelab (https://campus-groovelab.de)
# Location on Server: /root/scripts/server_maintenance_weekly.sh
# Crontab: 0 4 * * 0 /bin/bash /root/scripts/server_maintenance_weekly.sh >> /var/log/server_maintenance.log 2>&1
# ==============================================================================

set -eo pipefail

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=============================================================================="
echo "🧹 [$TIMESTAMP] Starte wöchentliche Server-Wartung für Campus-Groovelab..."
echo "=============================================================================="

# 1. Prune unused Docker images, builder cache, and networks (NEVER touch volumes)
if command -v docker >/dev/null 2>&1; then
  echo "📦 1. Bereinige ungenutzte Docker-Layer, alte Images und Build-Cache (Volumes geschützt)..."
  docker system prune -f --volumes=false || true
  docker image prune -a --filter "until=168h" -f 2>/dev/null || true
  docker builder prune -f --keep-storage 1GB || true
  echo "  ✓ Docker-Bereinigung abgeschlossen."
fi

# 2. Clean temporary files in /tmp (mtime-basiert gegen ENOSPC)
echo "🗑️  2. Bereinige temporäre Systemdateien und alte Dumps in /tmp..."
find /tmp -type f \( -name "*.sql.gz" -o -name "*.tmp" -o -name "dump_*" \) -mtime +2 -delete 2>/dev/null || true
find /tmp -type f -mtime +7 -delete 2>/dev/null || true
echo "  ✓ Temp-Bereinigung abgeschlossen."

# 3. Force logrotate execution
if [ -f "/etc/logrotate.d/campus_groovelab" ]; then
  echo "📜 3. Rotiere System- & Backup-Logs..."
  logrotate -f /etc/logrotate.d/campus_groovelab 2>/dev/null || true
  echo "  ✓ Log-Rotation ausgeführt."
fi

# 4. Database Janitor & Session Lease Pruning
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'supabase-db\|postgres'; then
  echo "🛡️  4. Führe automatisierten Enterprise Database & Session Lease Janitor aus..."
  DB_CONTAINER=$(docker ps --format '{{.Names}}' | grep 'supabase-db\|postgres' | head -n 1)
  docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -c "SELECT public.cleanup_expired_session_leases(); VACUUM ANALYZE public.session_leases; VACUUM ANALYZE public.progress_matrix; VACUUM ANALYZE public.user_song_skills;" 2>/dev/null || true
  echo "  ✓ Database Hygiene & Session Janitor erfolgreich ausgeführt."
fi

# 5. Final Storage Report
echo "📊 5. Aktueller Speicherplatz-Status nach Wartung:"
df -h / /mnt/supabase_data 2>/dev/null || df -h /

echo "=============================================================================="
echo "✅ [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Wöchentliche Wartung erfolgreich beendet."
echo "=============================================================================="
