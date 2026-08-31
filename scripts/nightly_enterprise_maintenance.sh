#!/bin/bash
# ==============================================================================
# Enterprise SaaS Nightly Maintenance & Backup Rotation Script
# Automates:
#   1. Daily PostgreSQL Database Backup
#   2. Rotation & Cleanup (Keep last 14 days)
#   3. Automated RLS Privilege & Security Audit
# ==============================================================================

set -euo pipefail

BACKUP_DIR="/mnt/supabase_data/backups"
LOG_FILE="/var/log/campus_groovelab_maintenance.log"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/campus_groovelab_daily_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

echo "========================================================" >> "$LOG_FILE"
echo "[$(date)] STARTE NÄCHTLICHE ENTERPRISE-WARTUNG" >> "$LOG_FILE"

# 1. DATABASE BACKUP
echo "[$(date)] 1. Erstelle komprimiertes PostgreSQL-Backup: $BACKUP_FILE..." >> "$LOG_FILE"
docker exec supabase-db pg_dump -U postgres postgres | gzip > "$BACKUP_FILE"
echo "[$(date)]    ✓ Backup erfolgreich erstellt ($(du -h "$BACKUP_FILE" | awk '{print $1}'))" >> "$LOG_FILE"

# 2. ROTATION & CLEANUP (Älter als 14 Tage löschen)
echo "[$(date)] 2. Rotiere alte Backups (Aufbewahrung: 14 Tage)..." >> "$LOG_FILE"
find "$BACKUP_DIR" -name "campus_groovelab_daily_*.sql.gz" -type f -mtime +14 -delete
echo "[$(date)]    ✓ Backup-Verzeichnis bereinigt." >> "$LOG_FILE"

# 3. PRIVILEGE & SECURITY AUDIT
echo "[$(date)] 3. Führe automatisiertes Privilege-Audit durch..." >> "$LOG_FILE"
RLS_UNPROTECTED=$(docker exec supabase-db psql -U postgres postgres -t -c "
    SELECT COUNT(*) 
    FROM pg_tables t 
    JOIN pg_class c ON c.relname = t.tablename 
    WHERE t.schemaname = 'public' AND c.relrowsecurity = false;
")

AIRGAP_VIOLATION=$(docker exec supabase-db psql -U postgres postgres -t -c "
    SELECT COUNT(*) 
    FROM pg_namespace 
    WHERE nspname = 'private_auth' AND (has_schema_privilege('anon', 'private_auth', 'usage') OR has_schema_privilege('authenticated', 'private_auth', 'usage'));
")

if [ "$(echo "$RLS_UNPROTECTED" | tr -d ' ')" -eq 0 ] && [ "$(echo "$AIRGAP_VIOLATION" | tr -d ' ')" -eq 0 ]; then
    echo "[$(date)]    ✅ SECURITY-STATUS: 100% GOLDSTANDARD (0 ungesicherte Tabellen, Air-Gap intakt)" >> "$LOG_FILE"
else
    echo "[$(date)]    ❌ SICHERHEITSWARNUNG: Ungesicherte Tabellen ($RLS_UNPROTECTED) oder AirGap-Verletzung ($AIRGAP_VIOLATION)!" >> "$LOG_FILE"
fi

echo "[$(date)] NÄCHTLICHE WARTUNG ERFOLGREICH ABGESCHLOSSEN." >> "$LOG_FILE"
echo "========================================================" >> "$LOG_FILE"
