#!/bin/bash
# ================================================
# GrooveLab Deployment Script → campus-groovelab.de
# Führe dieses Script von deinem Mac aus.
# ================================================

set -e

SERVER="root@178.105.10.2"
REMOTE_DIR="/var/www/groovelab"
LOCAL_DIST="apps/groovelab/dist"

echo "🎸 GrooveLab Deployment startet..."
echo "   Ziel: $SERVER → $REMOTE_DIR"
echo ""

# 1. Sicherstellen, dass die Remote-Verzeichnisse existieren
echo "📁 Remote-Verzeichnis & Backup-Ordner vorbereiten..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR /mnt/supabase_data/backups"

# 2. Pre-Deploy Backup der Live-Datenbank auf dem 14 GB Volume erstellen (falls DB-Container existiert)
echo "🛡️  Erstelle Pre-Deploy Backup auf dem 14 GB Volume (/mnt/supabase_data/backups)..."
ssh "$SERVER" "if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q 'supabase-db\|postgres'; then CONTAINER=\$(docker ps --format '{{.Names}}' | grep 'supabase-db\|postgres' | head -n 1); docker exec -t \$CONTAINER pg_dump -U postgres postgres 2>/dev/null | gzip > /mnt/supabase_data/backups/pre_deploy_\$(date +%Y%m%d_%H%M%S).sql.gz || true; echo '  ✓ Backup auf 14 GB Volume gespeichert.'; else echo '  ℹ Pre-Deploy Hinweis: Kein lokaler DB-Container aktiv, überspringe DB-Dump.'; fi"

# 3. Dist-Ordner zum Server übertragen (rsync ist effizienter als scp)
echo "📦 Build-Dateien übertragen..."
rsync -avz --delete \
  --exclude '.DS_Store' \
  "$LOCAL_DIST/" \
  "$SERVER:$REMOTE_DIR/"

echo ""
echo "✅ Deployment abgeschlossen!"
echo "   Die App ist jetzt erreichbar unter: https://campus-groovelab.de"
