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
echo "🚀 Übertrage Migrationen 297, 298, 299, 300, 301, 302, 303, 304, 305, 306, 307..."
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

echo "⚡ Führe Migration 305 aus (Idempotency Key Vault & RFC 7807 Handler)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/305_enterprise_idempotency_and_rfc7807.sql"

echo "⚡ Führe Migration 306 aus (RBAC Triggers & Room Confirmation Enforcement)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/306_enterprise_rbac_and_room_confirmation.sql"

echo "⚡ Führe Migration 307 aus (Statement Timeouts & Security Posture Audit)..."
ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres < $REMOTE_TEMP/307_enterprise_privilege_timeout_and_audit.sql"

# 5. Schema Cache in PostgREST neu laden
echo "🔄 Lade PostgREST Schema Cache neu..."
ssh "$SERVER" "docker exec -t supabase-db psql -U postgres postgres -c \"NOTIFY pgrst, 'reload schema';\""

# 6. Aufräumen
ssh "$SERVER" "rm -rf $REMOTE_TEMP"

echo ""
echo "✅ Alle Enterprise Sicherheitsmigrationen (297-301) erfolgreich auf Live-Datenbank angewendet!"
