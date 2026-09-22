#!/bin/bash
# ==============================================================================
# Campus-Groovelab Migration 465 Deployer
# Applies Migration 465 (Enterprise Message Crypto Dual-Key Resilience & Self-Healing)
# ==============================================================================

set -e

SERVER="${SERVER:-root@178.105.10.2}"
MIGRATION_FILE="supabase/migrations/465_enterprise_message_crypto_dual_key_resilience.sql"

echo "🛡️  Prüfe Migration 465 Datei: $MIGRATION_FILE"
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
echo "⚡ Führe Migration 465 auf $DB_CONTAINER aus..."

ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$MIGRATION_FILE" || \
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U supabase_admin -d postgres" < "$MIGRATION_FILE"

echo "🔄 PostgREST Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\""

echo "✅ Migration 465 erfolgreich angewendet und PostgREST Schema-Cache aktualisiert!"
