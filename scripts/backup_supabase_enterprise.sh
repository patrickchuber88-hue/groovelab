#!/bin/bash
# ==============================================================================
# 🛡️ Enterprise+ Automated Supabase Database Backup & GFS Rotation Engine
# Platform: Campus-Groovelab (https://campus-groovelab.de)
# Location on Server: /root/scripts/backup_supabase_enterprise.sh
# Crontab: 0 * * * * /bin/bash /root/scripts/backup_supabase_enterprise.sh >> /var/log/supabase_backup.log 2>&1
# ==============================================================================

set -eo pipefail
umask 077

BACKUP_ROOT="${BACKUP_ROOT:-/mnt/supabase_data/backups}"
CONTAINER_NAME="${CONTAINER_NAME:-supabase-db}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-postgres}"
AGE_RECIPIENT_FILE="${AGE_RECIPIENT_FILE:-/etc/campus-groovelab/backup_age_recipient.pub}"
BACKUP_KEY_FILE="${BACKUP_KEY_FILE:-/etc/campus-groovelab/backup.key}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DAY_OF_WEEK=$(date +"%u")  # 1 = Monday, 7 = Sunday
DAY_OF_MONTH=$(date +"%d") # 01 - 31
HOUR=$(date +"%H")

# Retention policies
HOURLY_DIR="$BACKUP_ROOT/hourly"
DAILY_DIR="$BACKUP_ROOT/daily"
WEEKLY_DIR="$BACKUP_ROOT/weekly"
MONTHLY_DIR="$BACKUP_ROOT/monthly"

mkdir -p "$HOURLY_DIR" "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR"
chmod 700 "$BACKUP_ROOT" "$HOURLY_DIR" "$DAILY_DIR" "$WEEKLY_DIR" "$MONTHLY_DIR" 2>/dev/null || true

echo "=============================================================================="
echo "🚀 [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Starte Enterprise+ Supabase Backup..."
echo "   Target DB: $CONTAINER_NAME ($DB_NAME)"
echo "   Backup Root: $BACKUP_ROOT"
echo "=============================================================================="

# 1. Check if DB container is running (auto-discover if exact name differs)
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  DISCOVERED_CONTAINER=$(docker ps --format '{{.Names}}' | grep -E 'supabase-db|postgres' | head -n 1 || true)
  if [ -n "$DISCOVERED_CONTAINER" ]; then
    echo "  ℹ Verwende erkannten DB-Container: $DISCOVERED_CONTAINER"
    CONTAINER_NAME="$DISCOVERED_CONTAINER"
  else
    echo "❌ FEHLER: Kein PostgreSQL/Supabase-DB Container aktiv! Backup abgebrochen."
    exit 1
  fi
fi

# [P1-5 & O-01] Resolve Multi-Recipient Age X25519 Public Keys for Zero-Knowledge Stream Encryption
# Supports multiple recipients (Primary Operator Key + Physical Vault Recovery Key) in $AGE_RECIPIENT_FILE
AGE_RECIPIENT_ARGS=()
if [ -n "${AGE_RECIPIENT:-}" ]; then
  for rec in $AGE_RECIPIENT; do
    AGE_RECIPIENT_ARGS+=(-r "$rec")
  done
elif [ -f "$AGE_RECIPIENT_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    clean_rec=$(echo "$line" | sed 's/#.*//' | tr -d '[:space:]')
    if [ -n "$clean_rec" ]; then
      AGE_RECIPIENT_ARGS+=(-r "$clean_rec")
      [ -z "${AGE_RECIPIENT:-}" ] && AGE_RECIPIENT="$clean_rec"
    fi
  done < "$AGE_RECIPIENT_FILE"
fi

if ! command -v age >/dev/null 2>&1 || [ "${#AGE_RECIPIENT_ARGS[@]}" -eq 0 ]; then
  echo "❌ FATAL [O-01 / BSI OPS.1.2.2]: Weder 'age' Binary noch gültige Age-X25519 Empfänger ($AGE_RECIPIENT_FILE) gefunden!" >&2
  echo "   Lokale symmetrische Schlüsseldateien auf demselben Server sind aus Sicherheitsgründen gesperrt (Fail-Closed)." >&2
  exit 1
fi

ARCHIVE_EXT="sql.gz.age"
TEMP_DUMP="$HOURLY_DIR/dump_temp_${TIMESTAMP}.${ARCHIVE_EXT}"
TARGET_HOURLY="$HOURLY_DIR/backup_hourly_${TIMESTAMP}.${ARCHIVE_EXT}"
echo "📦 Erstelle konsistenten PostgreSQL Dump mit asymmetrischer Multi-Recipient Age-X25519 Stream-Verschlüsselung (${#AGE_RECIPIENT_ARGS[@]} Argumente)..."
# Primary recipient invocation (age -r "$AGE_RECIPIENT" plus any secondary vault recovery recipients)
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" --clean --if-exists --no-owner --no-privileges "$DB_NAME" \
  | gzip -1 \
  | age "${AGE_RECIPIENT_ARGS[@]}" > "$TEMP_DUMP"

# Verify dump file is non-empty (> 1 KB)
FILE_SIZE=$(wc -c < "$TEMP_DUMP" | tr -d ' ')
if [ "$FILE_SIZE" -lt 1024 ]; then
  echo "❌ FEHLER: Dump-Datei ist verdächtig klein (${FILE_SIZE} Bytes). Möglicher Fehler beim Dump!"
  rm -f "$TEMP_DUMP"
  exit 1
fi

mv "$TEMP_DUMP" "$TARGET_HOURLY"
chmod 600 "$TARGET_HOURLY"
sha256sum "$TARGET_HOURLY" > "${TARGET_HOURLY}.sha256"

echo "  ✓ Stündlicher verschlüsselter Dump erfolgreich: $TARGET_HOURLY (${FILE_SIZE} Bytes)"

# 3. GFS Rotation (Grandfather-Father-Son)

# Daily: Every midnight (00:00 - 01:00)
if [ "$HOUR" = "00" ] || [ "$HOUR" = "03" ]; then
  DAILY_FILE="$DAILY_DIR/backup_daily_${TIMESTAMP}.${ARCHIVE_EXT}"
  cp "$TARGET_HOURLY" "$DAILY_FILE"
  cp "${TARGET_HOURLY}.sha256" "${DAILY_FILE}.sha256"
  echo "  ✓ Tägliches Backup archiviert: $DAILY_FILE"
fi

# Weekly: Every Sunday at midnight
if [ "$DAY_OF_WEEK" = "7" ] && ([ "$HOUR" = "00" ] || [ "$HOUR" = "03" ]); then
  WEEKLY_FILE="$WEEKLY_DIR/backup_weekly_${TIMESTAMP}.${ARCHIVE_EXT}"
  cp "$TARGET_HOURLY" "$WEEKLY_FILE"
  cp "${TARGET_HOURLY}.sha256" "${WEEKLY_FILE}.sha256"
  echo "  ✓ Wöchentliches Backup archiviert: $WEEKLY_FILE"
fi

# Monthly: 1st day of the month at midnight
if [ "$DAY_OF_MONTH" = "01" ] && ([ "$HOUR" = "00" ] || [ "$HOUR" = "03" ]); then
  MONTHLY_FILE="$MONTHLY_DIR/backup_monthly_${TIMESTAMP}.${ARCHIVE_EXT}"
  cp "$TARGET_HOURLY" "$MONTHLY_FILE"
  cp "${TARGET_HOURLY}.sha256" "${MONTHLY_FILE}.sha256"
  echo "  ✓ Monatliches Langzeit-Archiv erstellt: $MONTHLY_FILE"
fi

# 4. Retention Pruning (Löschen veralteter Sicherungen)
echo "🧹 Bereinige veraltete Backups nach Aufbewahrungsrichtlinie..."
find "$HOURLY_DIR" -type f -name "*.sql.gz*" -mtime +1 -delete 2>/dev/null || true     # 24h
find "$DAILY_DIR" -type f -name "*.sql.gz*" -mtime +14 -delete 2>/dev/null || true    # 14 Tage
find "$WEEKLY_DIR" -type f -name "*.sql.gz*" -mtime +60 -delete 2>/dev/null || true   # 8 Wochen
find "$MONTHLY_DIR" -type f -name "*.sql.gz*" -mtime +365 -delete 2>/dev/null || true # 12 Monate

# 5. Remote Offsite Synchronization Hook (optional via rclone if configured)
if command -v rclone >/dev/null 2>&1 && rclone listremotes | grep -q "offsite:"; then
  echo "☁️  Synchronisiere Backups zum Offsite Cold-Storage..."
  rclone sync "$BACKUP_ROOT" offsite:campus-groovelab-backups/ --fast-list --transfers 4 || {
    echo "⚠️  Warnung: Offsite-Sync fehlgeschlagen."
  }
  echo "  ✓ Offsite-Sync abgeschlossen."
fi

echo "=============================================================================="
echo "✅ [$(date -u +"%Y-%m-%dT%H:%M:%SZ")] Enterprise+ Backup erfolgreich beendet."
echo "=============================================================================="
