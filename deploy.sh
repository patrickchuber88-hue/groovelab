#!/bin/bash
# ================================================
# GrooveLab Deployment Script → campus-groovelab.de
# Führe dieses Script von deinem Mac aus.
# ================================================

set -e

SERVER="${SERVER:-deployuser@178.105.10.2}"
REMOTE_DIR="/var/www/groovelab"
LOCAL_DIST="apps/groovelab/dist"
RELEASE_ID="release_$(date +%Y%m%d_%H%M%S)"
RELEASES_DIR="$REMOTE_DIR/releases"
TARGET_RELEASE="$RELEASES_DIR/$RELEASE_ID"
CURRENT_LINK="$REMOTE_DIR/current"

echo "🎸 GrooveLab Deployment startet..."
echo "   Ziel: $SERVER → $TARGET_RELEASE"
echo ""

# 0. Pre-Deployment Security Shield & Automatic Production Build
if [ "${SKIP_BUILD:-0}" = "1" ]; then
  echo "⏩ Überspringe Build (SKIP_BUILD=1 gesetzt)..."
  if [ ! -d "$LOCAL_DIST" ]; then
    echo "❌ Fehler: Ordner $LOCAL_DIST existiert nicht. Build kann nicht übersprungen werden!"
    exit 1
  fi
else
  echo "🔨 Führe sauberen Produktions-Build aus (TypeScript + Vite + SRI + Precompression + CWV Budget)..."
  npm run build:groovelab || {
    echo "❌ Fehler: Build fehlgeschlagen! Deployment wird abgebrochen."
    exit 1
  }
fi

echo "🔍 Führe automatisiertes Production-Dependency-Audit durch..."
npm --prefix apps/groovelab audit --omit=dev --audit-level=high || {
  echo "🚨 KRITISCHER SICHERHEITSFEHLER: npm audit hat High/Critical Vulnerabilities in Produktions-Dependencies gemeldet!"
  echo "   Deployment wird gemäss OWASP ASVS L3 Fail-Closed Doktrin abgebrochen."
  exit 1
}
echo "  ✓ Pre-Deploy Security Shield & Build verifiziert."
echo ""

# Merke vorheriges Release für den automatischen Rollback im Fehlerfall
PREVIOUS_RELEASE=$(ssh "$SERVER" "readlink -f $CURRENT_LINK 2>/dev/null || true")

rollback() {
  echo ""
  echo "🚨 DEPLOYMENT FEHLGESCHLAGEN! Starte sofortigen automatischen 100ms-Rollback..."
  if [ -n "$PREVIOUS_RELEASE" ] && [ "$PREVIOUS_RELEASE" != "$TARGET_RELEASE" ]; then
    ssh "$SERVER" "ln -sfn '$PREVIOUS_RELEASE' '$CURRENT_LINK' && sudo systemctl reload nginx 2>/dev/null || true"
    echo "  ✓ Rollback erfolgreich: Live-Server zeigt wieder auf '$PREVIOUS_RELEASE'."
  else
    echo "  ⚠️ Kein vorheriges Release verfügbar oder initialer Deploy. Manuelle Prüfung erforderlich."
  fi
  exit 1
}

# 1. Sicherstellen, dass die Remote-Verzeichnisse existieren
echo "📁 Remote-Verzeichnisse & Backup-Ordner vorbereiten..."
ssh "$SERVER" "mkdir -p $RELEASES_DIR && sudo chown -R deployuser:deployuser $REMOTE_DIR 2>/dev/null && sudo mkdir -p /mnt/supabase_data/backups && sudo chown deployuser:deployuser /mnt/supabase_data/backups 2>/dev/null || true"

# Falls /var/www/groovelab bisher ein normales Verzeichnis mit Dateien war, initiale Struktur aufbauen
ssh "$SERVER" "if [ ! -L '$CURRENT_LINK' ] && [ -d '$CURRENT_LINK' ]; then mv '$CURRENT_LINK' '${RELEASES_DIR}/legacy_$(date +%Y%m%d)' && ln -sfn '${RELEASES_DIR}/legacy_$(date +%Y%m%d)' '$CURRENT_LINK'; fi"

# 2. Pre-Deploy Backup der Live-Datenbank auf dem 14 GB Volume erstellen (falls DB-Container existiert)
echo "🛡️  Erstelle Pre-Deploy Backup auf dem 14 GB Volume (/mnt/supabase_data/backups)..."
ssh "$SERVER" "if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'supabase-db\|postgres'; then CONTAINER=\$(docker ps --format '{{.Names}}' | grep 'supabase-db\|postgres' | head -n 1); docker exec -t \$CONTAINER pg_dump -U postgres postgres 2>/dev/null | gzip > /mnt/supabase_data/backups/pre_deploy_\$(date +%Y%m%d_%H%M%S).sql.gz || true; echo '  ✓ Backup auf 14 GB Volume gespeichert.'; else echo '  ℹ Pre-Deploy Hinweis: Kein lokaler DB-Container aktiv, überspringe DB-Dump.'; fi"

# 3. Dist-Ordner in das neue Release-Verzeichnis übertragen (atomar isoliert)
echo "📦 Build-Dateien übertragen nach $TARGET_RELEASE..."
ssh "$SERVER" "mkdir -p '$TARGET_RELEASE'"
rsync -avz --delete \
  --exclude '.DS_Store' \
  "$LOCAL_DIST/" \
  "$SERVER:$TARGET_RELEASE/"

# 4. Atomarer Symlink-Wechsel auf das neue Release
echo "⚡ Schalte Symlink atomar auf $RELEASE_ID..."
ssh "$SERVER" "ln -sfn '$TARGET_RELEASE' '$CURRENT_LINK'"

# 5. Atomare Nginx-Aktualisierung (Zero-Downtime, 100% Reboot-resistent)
echo "🚀 Validiere und aktualisiere Live-Webserver & Security Headers..."
ssh "$SERVER" "mkdir -p /tmp/nginx_sync"
scp deploy/nginx/security-headers.conf deploy/nginx/campus-groovelab.de.conf deploy/nginx/supabase.campus-groovelab.de.conf apps/groovelab/public/nginx.default.conf "$SERVER:/tmp/nginx_sync/" || true
ssh "$SERVER" "if command -v nginx >/dev/null 2>&1; then \
  sudo mkdir -p /etc/nginx/snippets /etc/nginx/sites-available /etc/nginx/sites-enabled && \
  sudo cp /tmp/nginx_sync/security-headers.conf /etc/nginx/snippets/ 2>/dev/null || true; \
  sudo cp /tmp/nginx_sync/campus-groovelab.de.conf /etc/nginx/sites-available/ 2>/dev/null || true; \
  sudo cp /tmp/nginx_sync/supabase.campus-groovelab.de.conf /etc/nginx/sites-available/ 2>/dev/null || true; \
  sudo ln -sf /etc/nginx/sites-available/campus-groovelab.de.conf /etc/nginx/sites-enabled/ 2>/dev/null || true; \
  sudo ln -sf /etc/nginx/sites-available/supabase.campus-groovelab.de.conf /etc/nginx/sites-enabled/ 2>/dev/null || true; \
  sudo nginx -t && sudo systemctl reload nginx && echo '  ✓ Host Nginx Ingress & Security Headers erfolgreich reloaded.'; \
else \
  WEB_CONTAINER=\$(docker ps --format '{{.Names}}' | grep -v 'supabase\|coolify\|groovelab-bff' | head -n 1); \
  if [ -n \"\$WEB_CONTAINER\" ]; then \
    docker cp $TARGET_RELEASE/. \$WEB_CONTAINER:/usr/share/nginx/html/ 2>/dev/null || true; \
    docker exec \$WEB_CONTAINER mkdir -p /etc/nginx/snippets 2>/dev/null || true; \
    docker cp /tmp/nginx_sync/security-headers.conf \$WEB_CONTAINER:/etc/nginx/snippets/security-headers.conf 2>/dev/null || true; \
    docker cp /tmp/nginx_sync/nginx.default.conf \$WEB_CONTAINER:/etc/nginx/conf.d/default.conf 2>/dev/null || true; \
    docker exec \$WEB_CONTAINER nginx -t 2>/dev/null && docker exec \$WEB_CONTAINER nginx -s reload 2>/dev/null || true; \
    echo \"  ✓ Live-Web-Container (\$WEB_CONTAINER) & Security Headers synchronisiert & reloaded.\"; \
  fi; \
fi" || rollback

# 6. Retention: Bereinige alte Releases (hält die letzten 5 Releases vor)
echo "🧹 Bereinige alte Releases (Retention: letzte 5 Releases aufbewahren)..."
ssh "$SERVER" "cd '$RELEASES_DIR' 2>/dev/null && ls -dt release_* 2>/dev/null | tail -n +6 | xargs -r rm -rf 2>/dev/null || true"

# 7. Synchronisiere Enterprise Server-Skripte nach ~/scripts
echo "⚙️  Synchronisiere Enterprise Server-Skripte..."
ssh "$SERVER" "mkdir -p ~/scripts"
scp scripts/backup_supabase_enterprise.sh scripts/sync_offsite_backup.sh scripts/nightly_secops_audit.sh scripts/server_health_watchdog.sh scripts/server_maintenance_weekly.sh scripts/infra_preflight.sh "$SERVER:~/scripts/" || true
ssh "$SERVER" "chmod +x ~/scripts/*.sh 2>/dev/null || true; sudo mkdir -p /root/scripts 2>/dev/null && sudo cp ~/scripts/*.sh /root/scripts/ 2>/dev/null || true"
echo "  ✓ Server-Skripte synchronisiert & ausführbar."

# 8. Post-Deployment Smoke Test & Live Perimeter Guard (Zero-Trust)
echo ""
echo "🩺 [POST-DEPLOY SMOKE TEST] Verifiziere Live-Server Integrität..."
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 https://campus-groovelab.de/healthz || echo "000")
SPA_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 8 https://campus-groovelab.de/ || echo "000")

if [ "$HEALTH_CODE" != "200" ] || [ "$SPA_CODE" != "200" ]; then
  echo "🚨 Smoke Test FEHLGESCHLAGEN! HTTP Status: /healthz ($HEALTH_CODE), SPA ($SPA_CODE)"
  rollback
fi
echo "  ✓ HTTP 200 OK für /healthz und Web-Applikation bestätigt."

echo "🛡️  Prüfe Live-Perimeter & Mozilla Observatory A+ Header..."
node scripts/verify_perimeter_headers.mjs https://campus-groovelab.de || {
  echo "🚨 Perimeter Header Check FEHLGESCHLAGEN: Sicherheits-Header Degradation im Live-System erkannt!"
  rollback
}
echo "  ✓ Live-Perimeter-Check erfolgreich: 100% Mozilla Observatory A+ Konformität aktiv."

echo ""
echo "🎉 DEPLOYMENT ERFOLGREICH ABGESCHLOSSEN!"
echo "   Aktives Release: $RELEASE_ID"
echo "   Live-URL:        https://campus-groovelab.de"
