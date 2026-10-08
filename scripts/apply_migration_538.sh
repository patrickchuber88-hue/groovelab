#!/bin/bash
# ==============================================================================
# Campus-Groovelab Enterprise Migrations Deployer (Migration 538)
# Applies Migration 538 to remote Supabase DB via SSH
# ==============================================================================

set -e

SERVER="${SERVER:-deployuser@178.105.10.2}"
MIGRATION_FILE="supabase/migrations/538_enterprise_audit_trail_hash_chain_v2_epoch.sql"

echo "🛡️  Prüfe Verbindung zu $SERVER..."
ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo '  ✓ SSH-Verbindung erfolgreich.'"

echo "📦 Suche aktiven Supabase-DB-Container auf dem Server..."
DB_CONTAINER=$(ssh "$SERVER" "docker ps --format '{{.Names}}' | grep -E 'supabase-db|postgres' | head -n 1")

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Fehler: Kein aktiver Supabase-DB-Container auf $SERVER gefunden."
  exit 1
fi

echo "  ✓ DB-Container identifiziert: $DB_CONTAINER"
echo ""

echo "🚀 Führe Migration aus: $(basename "$MIGRATION_FILE")..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$MIGRATION_FILE"

echo "🔄 PostgREST Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\""

echo "🎉 Migration 538 erfolgreich auf Live-Cluster angewendet!"
