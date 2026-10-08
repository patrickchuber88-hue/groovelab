#!/bin/bash
# ==============================================================================
# Campus-Groovelab Enterprise Migrations Deployer (Migrations 531 to 537)
# Applies Migrations 531, 532, 533, 534, 535, 536, 537 to remote Supabase DB via SSH
# ==============================================================================

set -e

SERVER="${SERVER:-deployuser@178.105.10.2}"
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

apply_migration "$MIGRATIONS_DIR/531_enterprise_anti_cheat_focus_session_validation.sql"
apply_migration "$MIGRATIONS_DIR/532_fix_occurrence_reschedule_push_time_cast.sql"
apply_migration "$MIGRATIONS_DIR/533_enterprise_authoritative_reschedule_decision_and_realtime.sql"
apply_migration "$MIGRATIONS_DIR/534_enterprise_message_crypto_fail_closed_and_header_resilience.sql"
apply_migration "$MIGRATIONS_DIR/535_enterprise_school_license_billing_lock.sql"
apply_migration "$MIGRATIONS_DIR/536_enterprise_campus_groovelab_song_isolation.sql"
apply_migration "$MIGRATIONS_DIR/537_teacher_score_snippets.sql"

echo "🔄 PostgREST Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\""

echo "🎉 Alle Migrationen (531 bis 537) erfolgreich auf Live-Cluster angewendet!"
