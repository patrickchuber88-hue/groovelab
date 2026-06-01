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

# 1. Sicherstellen, dass der Remote-Ordner existiert
echo "📁 Remote-Verzeichnis vorbereiten..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR"

# 2. Dist-Ordner zum Server übertragen (rsync ist effizienter als scp)
echo "📦 Build-Dateien übertragen..."
rsync -avz --delete \
  --exclude '.DS_Store' \
  "$LOCAL_DIST/" \
  "$SERVER:$REMOTE_DIR/"

echo ""
echo "✅ Deployment abgeschlossen!"
echo "   Die App ist jetzt erreichbar unter: https://campus-groovelab.de"
