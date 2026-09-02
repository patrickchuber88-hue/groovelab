#!/bin/bash
# ==============================================================================
# Campus-Groovelab Tier-1 Enterprise+ Migration Deployer
# Applies Migrations 330, 331, 332 to remote Supabase DB via SSH
# ==============================================================================

set -e

SERVER="root@178.105.10.2"
MIGRATIONS_DIR="supabase/migrations"

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

apply_migration() {
  local FILE=$1
  local BASENAME=$(basename "$FILE")
  echo "🚀 Führe Migration aus: $BASENAME..."
  
  ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres" < "$FILE" || \
  ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U supabase_admin -d postgres" < "$FILE"
  
  echo "  ✓ Migration $BASENAME erfolgreich eingespielt!"
  echo ""
}

apply_migration "$MIGRATIONS_DIR/330_tier1_enterprise_immediate_protection_and_auth_rpc.sql"
apply_migration "$MIGRATIONS_DIR/331_tier1_enterprise_role_switch_and_ghost_session_hardening.sql"
apply_migration "$MIGRATIONS_DIR/332_tier1_enterprise_storage_and_destructive_operations_hardening.sql"
apply_migration "$MIGRATIONS_DIR/336_restore_session_lease_rpc_and_auth_resolver.sql"
apply_migration "$MIGRATIONS_DIR/339_enterprise_crisis_governance_and_audit.sql"
apply_migration "$MIGRATIONS_DIR/340_fix_switch_user_active_role_type_cast.sql"
apply_migration "$MIGRATIONS_DIR/341_fix_users_view_user_secrets_permission.sql"

echo "🔄 Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\"" || true

echo "✅ Alle Sicherheitsmigrationen (330, 331, 332, 336, 339, 340, 341) wurden erfolgreich auf dem Produktivserver angewendet!"
