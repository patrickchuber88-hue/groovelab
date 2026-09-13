#!/bin/bash
# ==============================================================================
# Campus-Groovelab Migration 410 Deployer
# Applies Migration 410 (Campus Chat Channel Reads & Notification Goldstandard)
# ==============================================================================

set -e

SERVER="${SERVER:-root@178.105.10.2}"
MIGRATION_FILE="supabase/migrations/410_campus_chat_channel_reads.sql"

echo "🛡️  Prüfe Migration 410 Datei: $MIGRATION_FILE"
if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Fehler: $MIGRATION_FILE nicht gefunden!"
  exit 1
fi

echo "🚀 Verbinde mit $SERVER..."
DB_CONTAINER=$(ssh -o ConnectTimeout=8 "$SERVER" "docker ps --format '{{.Names}}' | grep -E 'supabase-db|postgres' | head -n 1")

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Fehler: Kein aktiver Supabase-DB-Container auf $SERVER gefunden."
  exit 1
fi

echo "  ✓ DB-Container gefunden: $DB_CONTAINER"
echo "⚡ Führe Migration 410 auf $DB_CONTAINER aus..."

ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$MIGRATION_FILE" || \
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U supabase_admin -d postgres" < "$MIGRATION_FILE"

echo "🔄 PostgREST Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\""

echo "✅ Migration 410 erfolgreich angewendet und PostgREST Schema-Cache aktualisiert!"
