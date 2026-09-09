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
apply_migration "$MIGRATIONS_DIR/357_dedicated_calendar_token_and_revocation_rpc.sql"
apply_migration "$MIGRATIONS_DIR/358_student_homework_question_rpc.sql"
apply_migration "$MIGRATIONS_DIR/359_student_schedule_absence_rpc_and_schema_alignment.sql"
apply_migration "$MIGRATIONS_DIR/360_audit_proof_schedule_absence_timestamps.sql"
apply_migration "$MIGRATIONS_DIR/361_enterprise_goldstandard_din66398_retention_and_pruning_hardening.sql"
apply_migration "$MIGRATIONS_DIR/362_rebuild_kiosk_system_and_offline_tokens.sql"
apply_migration "$MIGRATIONS_DIR/363_tier1_enterprise_sql_identity_caching_and_indexes.sql"
apply_migration "$MIGRATIONS_DIR/364_enterprise_threat_detection_and_identity_hygiene.sql"
apply_migration "$MIGRATIONS_DIR/365_enterprise_goldstandard_student_zero_lastname.sql"
apply_migration "$MIGRATIONS_DIR/366_enterprise_rate_limiting_and_auth_hygiene.sql"
apply_migration "$MIGRATIONS_DIR/367_enterprise_parental_absence_reason_and_audit.sql"
apply_migration "$MIGRATIONS_DIR/368_enterprise_owasp_p0_security_and_audio_hardening.sql"
apply_migration "$MIGRATIONS_DIR/369_enterprise_student_profile_security_and_audit.sql"
apply_migration "$MIGRATIONS_DIR/370_enterprise_parent_child_security_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/371_enterprise_parent_security_recovery_and_session_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/372_enterprise_immediate_audio_purge_on_student_exit.sql"
apply_migration "$MIGRATIONS_DIR/373_enterprise_parental_chat_toggle_and_privacy_controls.sql"
apply_migration "$MIGRATIONS_DIR/374_enterprise_parental_chat_toggle_rpc.sql"
apply_migration "$MIGRATIONS_DIR/375_enterprise_parental_chat_toggle_clean.sql"
apply_migration "$MIGRATIONS_DIR/376_enterprise_parental_absence_cancellation_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/377_enterprise_pre_live_performance_and_covering_indexes.sql"
apply_migration "$MIGRATIONS_DIR/378_enterprise_absence_cancellation_status_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/379_enterprise_direct_billing_student_count_repair.sql"
apply_migration "$MIGRATIONS_DIR/380_enterprise_direct_billing_student_count_safe.sql"
apply_migration "$MIGRATIONS_DIR/381_enterprise_storage_mutation_scoping_and_force_rls.sql"
apply_migration "$MIGRATIONS_DIR/382_enterprise_student_onboarding_pins_and_consent_v2.sql"
apply_migration "$MIGRATIONS_DIR/383_add_skill_radar_levels.sql"
apply_migration "$MIGRATIONS_DIR/384_campus_mitteilungen_anonymous_flag.sql"
apply_migration "$MIGRATIONS_DIR/384_enterprise_forensic_security_hardening_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/385_student_onboarding_granular_permissions_sync.sql"
apply_migration "$MIGRATIONS_DIR/386_enterprise_forensic_remediation_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/387_enterprise_forensic_seal_goldstandard.sql"
apply_migration "$MIGRATIONS_DIR/388_enterprise_forensic_master_seal.sql"

echo "🔄 Schema-Cache aktualisieren..."
ssh "$SERVER" "docker exec -i $DB_CONTAINER psql -U postgres -d postgres -c \"NOTIFY pgrst, 'reload schema';\"" || true

echo "✅ Alle Sicherheitsmigrationen (330-388) wurden erfolgreich auf dem Produktivserver angewendet!"

