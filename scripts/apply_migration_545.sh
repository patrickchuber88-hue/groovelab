#!/bin/bash
# ==============================================================================
# Campus-Groovelab Enterprise Migrations Deployer (Migration 545)
# Applies Migration 545 to remote Supabase DB via SSH (deployuser@178.105.10.2)
# ==============================================================================

set -e

SERVER="${SERVER:-deployuser@178.105.10.2}"
MIGRATION_FILE="supabase/migrations/545_fix_last_admin_lockout_dual_roles.sql"

echo "🛡️  Prüfe Verbindung zu $SERVER..."
ssh -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" "echo '  ✓ SSH-Verbindung erfolgreich.'"

echo "📦 Suche aktiven Supabase-DB-Container auf dem Server..."
DB_CONTAINER=$(ssh -o BatchMode=yes "$SERVER" "docker ps --format '{{.Names}}' | grep -E 'supabase-db|postgres' | head -n 1")

if [ -z "$DB_CONTAINER" ]; then
  echo "❌ Fehler: Kein aktiver Supabase-DB-Container auf $SERVER gefunden."
  exit 1
fi

echo "  ✓ DB-Container identifiziert: $DB_CONTAINER"
echo ""

echo "🚀 Führe Migration 545 aus ($MIGRATION_FILE)..."
ssh -o BatchMode=yes "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$MIGRATION_FILE"

echo ""
echo "🔍 Verifiziere Migration 545 (prevent_last_admin_lockout Definition):"
ssh -o BatchMode=yes "$SERVER" "docker exec $DB_CONTAINER psql -U postgres -d postgres -c \"SELECT proname, prosrc FROM pg_proc WHERE proname = 'prevent_last_admin_lockout';\""

echo ""
echo "✅ Migration 545 erfolgreich und atomar auf Hetzner-Cluster angewendet!"
