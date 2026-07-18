#!/bin/bash
# Enterprise Single-Node Database Backup Script
# Dump -> Compress -> Hetzner Storage Box

BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DB_CONTAINER="supabase-db"
DB_USER="postgres"
DUMP_FILE="$BACKUP_DIR/db_dump_$TIMESTAMP.sql"
ARCHIVE_FILE="$BACKUP_DIR/db_dump_$TIMESTAMP.tar.gz"

echo "================================================="
echo "[$(date)] Starte Supabase Datenbank Backup"
echo "================================================="

# 1. Sicherstellen, dass das Backup-Verzeichnis existiert
mkdir -p "$BACKUP_DIR"

# 2. Dump der gesamten Datenbank (inkl. Roles) aus dem laufenden Container ziehen
echo "[$(date)] Exportiere Daten mit pg_dumpall aus Container: $DB_CONTAINER..."
docker exec "$DB_CONTAINER" pg_dumpall -c -U "$DB_USER" > "$DUMP_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date)] pg_dumpall erfolgreich."
else
    echo "[$(date)] FEHLER beim pg_dumpall!"
    exit 1
fi

# 3. Dump komprimieren, um Speicherplatz zu sparen
echo "[$(date)] Komprimiere Backup zu $ARCHIVE_FILE..."
tar -czf "$ARCHIVE_FILE" -C "$BACKUP_DIR" "$(basename "$DUMP_FILE")"
rm "$DUMP_FILE" # Unkomprimierte Datei löschen

# 4. Upload zur Hetzner Storage Box (Auskommentiert, muss vom Admin eingerichtet werden)
# HINWEIS: Bitte SSH Keys für die Storage Box auf dem Server hinterlegen, damit SCP passwortlos klappt.
STORAGE_BOX_USER="uXXXXXX" # HIER ANPASSEN
STORAGE_BOX_HOST="${STORAGE_BOX_USER}.your-storagebox.de"

echo "[$(date)] Upload zur Storage Box ($STORAGE_BOX_HOST) via SCP (derzeit deaktiviert)..."
# scp -P 23 "$ARCHIVE_FILE" "$STORAGE_BOX_USER@$STORAGE_BOX_HOST:backups/"

# 5. Alte lokale Backups aufräumen (nur die letzten 7 behalten)
echo "[$(date)] Bereinige lokale Backups (älter als 7 Tage)..."
find "$BACKUP_DIR" -type f -name "db_dump_*.tar.gz" -mtime +7 -exec rm {} \;

echo "[$(date)] Backup-Prozess abgeschlossen."
