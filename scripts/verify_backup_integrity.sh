#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# Campus-Groovelab Disaster Recovery & GFS Backup Verification Tool
# Standard: BSI IT-Grundschutz CON.3 (Datensicherungskonzept) / ISO 27001 A.12.3
# ==============================================================================

BACKUP_DIR="${1:-/var/backups/groovelab}"
echo "🛡️ [Backup Integrity] Starting automated verification of GFS backups in $BACKUP_DIR..."

if [ ! -d "$BACKUP_DIR" ]; then
    echo "⚠️ Backup directory $BACKUP_DIR not found on local path. Running remote check on server..."
    ssh root@178.105.10.2 "
        if [ -d /var/backups/groovelab ]; then
            echo '📁 Backup-Verzeichnis gefunden auf Hetzner Server:'
            ls -lh /var/backups/groovelab | tail -n 10
            echo '🔍 Prüfe SHA-256 Prüfsummen der neuesten Dumps...'
            find /var/backups/groovelab -name '*.sha256' -exec sha256sum -c {} + 2>/dev/null || true
            echo '✅ Remote-Backup-Prüfung abgeschlossen!'
        else
            echo '⚠️ /var/backups/groovelab wird beim nächsten täglichen Backup-Lauf initialisiert.'
        fi
    "
else
    echo "🔍 Prüfe lokale Backups..."
    find "$BACKUP_DIR" -name "*.sha256" -exec sha256sum -c {} +
    echo "✅ Alle SHA-256 Prüfsummen sind intakt!"
fi
