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
apply_migration "$MIGRATIONS_DIR/342_enterprise_goldstandard_data_partitioning_and_janitor_alignment.sql"
apply_migration "$MIGRATIONS_DIR/343_deprecate_and_cleanup_cooperations.sql"
apply_migration "$MIGRATIONS_DIR/344_secure_employee_role_management_rpc.sql"
apply_migration "$MIGRATIONS_DIR/345_restore_and_harden_set_initial_student_pin_rpc.sql"
apply_migration "$MIGRATIONS_DIR/346_revisionssicheres_buchungsjournal_und_storage.sql"
apply_migration "$MIGRATIONS_DIR/355_save_parent_controls_and_audit_hardening.sql"
apply_migration "$MIGRATIONS_DIR/356_revisionssichere_elterneinstellungen_und_parent_permissions.sql"

echo "🔄 Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\"" || true

echo "✅ Alle Sicherheitsmigrationen (330-356) wurden erfolgreich auf dem Produktivserver angewendet!"
