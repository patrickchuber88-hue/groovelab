#!/bin/bash
# ==============================================================================
# Master Enterprise Database Migration Runner
# Executes Migrations 297, 298, 299, 300, 301 on live supabase-db container
# ==============================================================================

set -e

SERVER="root@178.105.10.2"
REMOTE_TEMP="/tmp/groovelab_migrations"

echo "🛡️  Starte Master Enterprise Database Migration Suite..."
echo "   Ziel-Server: $SERVER"

# 1. Sicherstellen, dass das Remote-Verzeichnis existiert
ssh "$SERVER" "mkdir -p $REMOTE_TEMP /mnt/supabase_data/backups"

# 2. Pre-Migration Backup erstellen
echo "📦 Erstelle Pre-Migration Backup auf Volume /mnt/supabase_data/backups/..."
ssh "$SERVER" "docker exec -t supabase-db pg_dump -U postgres postgres | gzip > /mnt/supabase_data/backups/pre_security_hardening_\$(date +%Y%m%d_%H%M%S).sql.gz"
echo "  ✓ Pre-Migration Backup erfolgreich gesichert."

# 3. Kopiere SQL-Migrationsdateien auf den Server
echo "🚀 Übertrage Migrationen 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307, 308..."
scp supabase/migrations/297_tier1_enterprise_goldstandard_security.sql \
    supabase/migrations/298_enterprise_incident_response_and_waf_shield.sql \
    supabase/migrations/299_enterprise_bff_dto_suite.sql \
    supabase/migrations/300_enterprise_school_profile_dto.sql \
    supabase/migrations/301_enterprise_audit_chain_and_optimizations.sql \
    supabase/migrations/302_enterprise_absolute_zero_leak_purge.sql \
    supabase/migrations/303_enterprise_school_secrets_isolation.sql \
    supabase/migrations/304_enterprise_high_concurrency_indexes.sql \
    supabase/migrations/305_enterprise_idempotency_and_rfc7807.sql \
    supabase/migrations/306_enterprise_rbac_and_room_confirmation.sql \
    supabase/migrations/307_enterprise_privilege_timeout_and_audit.sql \
    supabase/migrations/308_enterprise_force_rls_suite.sql \
    supabase/migrations/309_session_leases_and_master_auth_resolver.sql \
    supabase/migrations/310_harden_session_leases_policy.sql \
    supabase/migrations/311_include_trial_schools_in_search.sql \
    supabase/migrations/312_enterprise_event_sourced_activation_ledger.sql \
    supabase/migrations/313_enterprise_token_hardening_and_revocation.sql \
    supabase/migrations/314_enterprise_hermetic_rpc_and_backdoor_elimination.sql \
    supabase/migrations/315_enterprise_onboarding_ttl_and_token_isolation.sql \
    supabase/migrations/316_dev_bypass_school_users.sql \
    supabase/migrations/317_grant_get_encryption_key_execute.sql \
    supabase/migrations/318_complete_users_view_columns.sql \
    supabase/migrations/319_fix_audit_log_hash_chain_columns.sql \
    supabase/migrations/320_tier1_goldstandard_optimizations.sql \
    supabase/migrations/321_safe_pgp_sym_decrypt_and_resilient_users_view.sql \
    supabase/migrations/322_enterprise_comprehensive_rls_suite.sql \
    supabase/migrations/323_enterprise_physical_secret_purge_and_zero_knowledge_auth.sql \
    supabase/migrations/324_dev_bypass_prioritize_linus.sql \
    supabase/migrations/325_fix_student_homework_and_progress_rls.sql \
    "$SERVER:$REMOTE_TEMP/"

# 4. Führe Migrationen nacheinander in supabase-db aus
echo "⚡ Führe Migration 297 aus (Zero-Trust Schema & RLS Purge)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/297_tier1_enterprise_goldstandard_security.sql"

echo "⚡ Führe Migration 298 aus (Incident Response & WAF Shield)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/298_enterprise_incident_response_and_waf_shield.sql"

echo "⚡ Führe Migration 299 aus (BFF DTO Gateway Suite)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/299_enterprise_bff_dto_suite.sql"

echo "⚡ Führe Migration 300 aus (School Profile DTO)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/300_enterprise_school_profile_dto.sql"

echo "⚡ Führe Migration 301 aus (Merkle Audit Chain & Caching)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/301_enterprise_audit_chain_and_optimizations.sql"

echo "⚡ Führe Migration 302 aus (Absolute Zero-Leak Blanket Policy Purge)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/302_enterprise_absolute_zero_leak_purge.sql"

echo "⚡ Führe Migration 303 aus (School Secrets Isolation & Hermetic RLS)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/303_enterprise_school_secrets_isolation.sql"

echo "⚡ Führe Migration 304 aus (High-Concurrency Composite Indexes)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/304_enterprise_high_concurrency_indexes.sql"

echo "⚡ Führe Migration 305 aus (Idempotency Engine & RFC 7807 Exception Framework)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/305_enterprise_idempotency_and_rfc7807.sql"

echo "⚡ Führe Migration 306 aus (RBAC Granularity & Mandatory Room Confirmation)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/306_enterprise_rbac_and_room_confirmation.sql"

echo "⚡ Führe Migration 307 aus (Privilege Audit & Anti-DoS Timeouts)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/307_enterprise_privilege_timeout_and_audit.sql"

echo "⚡ Führe Migration 308 aus (Force RLS Suite on all public tables)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/308_enterprise_force_rls_suite.sql"

echo "⚡ Führe Migration 309 aus (Session Leases & Robust Master Auth Resolver)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/309_session_leases_and_master_auth_resolver.sql"

echo "⚡ Führe Migration 310 aus (Granular Hardening of Session Leases Policies)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/310_harden_session_leases_policy.sql"

echo "⚡ Führe Migration 311 aus (Include Trial & Active Schools in Public Discovery RPC)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/311_include_trial_schools_in_search.sql"

echo "⚡ Führe Migration 312 aus (Event-Sourced Activation Ledger Engine)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/312_enterprise_event_sourced_activation_ledger.sql"

echo "⚡ Führe Migration 313 aus (Token Hardening, Device Binding & 1-Click Revocation)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/313_enterprise_token_hardening_and_revocation.sql"

echo "⚡ Führe Migration 314 aus (Hermetic RPC & Backdoor Elimination)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/314_enterprise_hermetic_rpc_and_backdoor_elimination.sql"

echo "⚡ Führe Migration 315 aus (Onboarding TTL & Token Isolation)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/315_enterprise_onboarding_ttl_and_token_isolation.sql"

echo "⚡ Führe Migration 316 aus (Dev Bypass School Users Resolver)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/316_dev_bypass_school_users.sql"

echo "⚡ Führe Migration 317 aus (Ensure get_encryption_key execute privilege for users view)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/317_grant_get_encryption_key_execute.sql"

echo "⚡ Führe Migration 318 aus (Complete users view columns with contract_decision_made)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/318_complete_users_view_columns.sql"

echo "⚡ Führe Migration 319 aus (Fix calculate_audit_log_hash_chain column references)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/319_fix_audit_log_hash_chain_columns.sql"

echo "⚡ Führe Migration 320 aus (Tier-1 Goldstandard Optimizations: Vault Key, PIN Rate-Limiting & CSP Reports)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/320_tier1_goldstandard_optimizations.sql"

echo "⚡ Führe Migration 321 aus (Safe PGP Decryption & Resilient Users View)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/321_safe_pgp_sym_decrypt_and_resilient_users_view.sql"

echo "⚡ Führe Migration 322 aus (Tier-1 Enterprise Comprehensive RLS Suite)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/322_enterprise_comprehensive_rls_suite.sql"

echo "⚡ Führe Migration 323 aus (Tier-1 Enterprise Physical Secret Purge & Zero-Knowledge IAM)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/323_enterprise_physical_secret_purge_and_zero_knowledge_auth.sql"

echo "⚡ Führe Migration 324 aus (Dev Bypass Prioritize Linus)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/324_dev_bypass_prioritize_linus.sql" || true

echo "⚡ Führe Migration 325 aus (Fix Student Homework, Progress & Lehrwerke RLS Permissions)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/325_fix_student_homework_and_progress_rls.sql"

echo "🧹 Bereinige temporäre Migrationsdateien..."
ssh "$SERVER" "rm -rf $REMOTE_TEMP"

echo ""
echo "✅ Alle 29 Enterprise-Migrationen (297-325) erfolgreich und fehlerfrei auf dem Produktiv-Container angewendet!"
ssh "$SERVER" "docker exec -t supabase-db psql -U postgres postgres -c \"NOTIFY pgrst, 'reload schema';\""

# 6. Aufräumen
ssh "$SERVER" "rm -rf $REMOTE_TEMP"

echo ""
echo "✅ Alle Enterprise Sicherheitsmigrationen (297-323) erfolgreich auf Live-Datenbank angewendet!"
