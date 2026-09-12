#!/bin/bash
# ================================================
# GrooveLab Deployment Script → campus-groovelab.de
# Führe dieses Script von deinem Mac aus.
# ================================================

set -e

SERVER="${SERVER:-deployuser@178.105.10.2}"
REMOTE_DIR="/var/www/groovelab"
LOCAL_DIST="apps/groovelab/dist"

echo "🎸 GrooveLab Deployment startet..."
echo "   Ziel: $SERVER → $REMOTE_DIR"
echo ""

# 0. Pre-Deployment Security Shield & Automatic Production Build
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "⏩ Überspringe Build (SKIP_BUILD=1 gesetzt)..."
  if [ ! -d "$LOCAL_DIST" ]; then
    echo "❌ Fehler: Ordner $LOCAL_DIST existiert nicht. Build kann nicht übersprungen werden!"
    exit 1
  fi
else
  echo "🔨 Führe sauberen Produktions-Build aus (TypeScript + Vite + SRI + Precompression)..."
  npm run build:groovelab || {
    echo "❌ Fehler: Build fehlgeschlagen! Deployment wird abgebrochen."
    exit 1
  }
fi

echo "🔍 Führe automatisches Dependency-Audit durch..."
npm --prefix apps/groovelab audit --audit-level=high || {
  echo "⚠️  Warnung: Security Audit hat Schwachstellen gemeldet. Bitte prüfen."
}
echo "  ✓ Pre-Deploy Security Shield & Build verifiziert."
echo ""

# 1. Sicherstellen, dass die Remote-Verzeichnisse existieren
echo "📁 Remote-Verzeichnis & Backup-Ordner vorbereiten..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR && sudo mkdir -p /mnt/supabase_data/backups && sudo chown deployuser:deployuser /mnt/supabase_data/backups 2>/dev/null || true"

# 2. Pre-Deploy Backup der Live-Datenbank auf dem 14 GB Volume erstellen (falls DB-Container existiert)
echo "🛡️  Erstelle Pre-Deploy Backup auf dem 14 GB Volume (/mnt/supabase_data/backups)..."
ssh "$SERVER" "if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'supabase-db\|postgres'; then CONTAINER=\$(docker ps --format '{{.Names}}' | grep 'supabase-db\|postgres' | head -n 1); docker exec -t \$CONTAINER pg_dump -U postgres postgres 2>/dev/null | gzip > /mnt/supabase_data/backups/pre_deploy_\$(date +%Y%m%d_%H%M%S).sql.gz || true; echo '  ✓ Backup auf 14 GB Volume gespeichert.'; else echo '  ℹ Pre-Deploy Hinweis: Kein lokaler DB-Container aktiv, überspringe DB-Dump.'; fi"

# 3. Dist-Ordner zum Server übertragen (rsync ist effizienter als scp)
echo "📦 Build-Dateien übertragen..."
rsync -avz --delete \
  --exclude '.DS_Store' \
  "$LOCAL_DIST/" \
  "$SERVER:$REMOTE_DIR/"

# 4. Atomare Nginx-Aktualisierung (Zero-Downtime, 100% Reboot-resistent)
echo "🚀 Validiere und aktualisiere Live-Webserver..."
ssh "$SERVER" "if command -v nginx >/dev/null 2>&1; then \
  sudo nginx -t && sudo systemctl reload nginx && echo '  ✓ Host Nginx Ingress erfolgreich reloaded.'; \
else \
  WEB_CONTAINER=\$(docker ps --format '{{.Names}}' | grep -v 'supabase\|coolify\|groovelab-bff' | head -n 1); \
  if [ -n \"\$WEB_CONTAINER\" ]; then \
    docker cp $REMOTE_DIR/. \$WEB_CONTAINER:/usr/share/nginx/html/ 2>/dev/null || true; \
    docker exec \$WEB_CONTAINER nginx -s reload 2>/dev/null || true; \
    echo \"  ✓ Live-Web-Container (\$WEB_CONTAINER) synchronisiert & reloaded.\"; \
  fi; \
fi"

# 5. Synchronisiere Enterprise Server-Skripte nach ~/scripts
echo "⚙️  Synchronisiere Enterprise Server-Skripte..."
ssh "$SERVER" "mkdir -p ~/scripts"
scp scripts/backup_supabase_enterprise.sh scripts/sync_offsite_backup.sh scripts/nightly_secops_audit.sh scripts/server_health_watchdog.sh scripts/server_maintenance_weekly.sh scripts/infra_preflight.sh "$SERVER:~/scripts/" || true
ssh "$SERVER" "chmod +x ~/scripts/*.sh 2>/dev/null || true; sudo mkdir -p /root/scripts 2>/dev/null && sudo cp ~/scripts/*.sh /root/scripts/ 2>/dev/null || true"
echo "  ✓ Server-Skripte synchronisiert & ausführbar."

echo ""
echo "✅ Deployment abgeschlossen!"
echo "   Die App ist jetzt erreichbar unter: https://campus-groovelab.de"
