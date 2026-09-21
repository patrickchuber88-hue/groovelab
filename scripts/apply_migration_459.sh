#!/bin/bash
# ==============================================================================
# Campus-Groovelab Migration 459 Deployer
# Applies Migration 459 (Subjects Deduplication & Unique Invariant)
# ==============================================================================

set -e

SERVER="${SERVER:-root@178.105.10.2}"
MIGRATION_FILE="supabase/migrations/459_enterprise_subjects_deduplication_and_unique_constraint.sql"

echo "🛡️  Prüfe Migration 459 Datei: $MIGRATION_FILE"
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
echo "⚡ Führe Migration 459 auf $DB_CONTAINER aus..."

ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$MIGRATION_FILE" || \
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U supabase_admin -d postgres" < "$MIGRATION_FILE"

echo "🔄 PostgREST Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\""

echo "✅ Migration 459 erfolgreich angewendet und PostgREST Schema-Cache aktualisiert!"
