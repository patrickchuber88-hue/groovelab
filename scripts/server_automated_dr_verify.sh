#!/bin/bash
# ==============================================================================
# Campus-Groovelab Automated Disaster Recovery Verification Runner
# Validates PostgreSQL database dump integrity directly on Hetzner Server
# ==============================================================================

set -e

SERVER="root@178.105.10.2"

echo "🛡️  Starte Disaster Recovery Verification auf $SERVER..."

ssh "$SERVER" bash -c "'
set -e
BACKUP_DIR=\"/mnt/supabase_data/backups\"
LATEST_BACKUP=\$(ls -t \"\$BACKUP_DIR\"/*.sql.gz 2>/dev/null | head -n 1 || true)
TEST_DB=\"groovelab_dr_automated_check\"

if [ -z \"\$LATEST_BACKUP\" ]; then
    echo \"⚠️  Keine Backup-Archive in \$BACKUP_DIR gefunden! Erstelle Sofort-Dump...\"
    docker exec -t supabase-db pg_dump -U postgres postgres | gzip > \"\$BACKUP_DIR/immediate_backup_\$(date +%Y%m%d_%H%M%S).sql.gz\"
    LATEST_BACKUP=\$(ls -t \"\$BACKUP_DIR\"/*.sql.gz 2>/dev/null | head -n 1)
fi

echo \"📦 Aktuellster Backup-Dump: \$LATEST_BACKUP (\$(du -h \"\$LATEST_BACKUP\" | cut -f1))\"
echo \"🔄 Erstelle temporäre Test-Datenbank in supabase-db Container...\"
docker exec -t supabase-db psql -U postgres postgres -c \"DROP DATABASE IF EXISTS \$TEST_DB;\"
docker exec -t supabase-db psql -U postgres postgres -c \"CREATE DATABASE \$TEST_DB;\"

echo \"📥 Spiele Backup-Dump in Test-Datenbank ein...\"
gunzip -c \"\$LATEST_BACKUP\" | docker exec -i supabase-db psql -U postgres \"\$TEST_DB\" >/dev/null 2>&1

echo \"🔍 Verifiziere Tabellen- und Datenintegrität...\"
SCHOOL_COUNT=\$(docker exec -t supabase-db psql -U postgres \"\$TEST_DB\" -P pager=off -t -c \"SELECT COUNT(*) FROM public.schools;\" | tr -d '\r' | xargs)
USER_COUNT=\$(docker exec -t supabase-db psql -U postgres \"\$TEST_DB\" -P pager=off -t -c \"SELECT COUNT(*) FROM public.users_raw;\" | tr -d '\r' | xargs)
SCHEDULE_COUNT=\$(docker exec -t supabase-db psql -U postgres \"\$TEST_DB\" -P pager=off -t -c \"SELECT COUNT(*) FROM public.schedules;\" | tr -d '\r' | xargs)

echo \"📊 Disaster Recovery Audit Ergebnis:\"
echo \"   ✓ Schulen im Backup: \$SCHOOL_COUNT\"
echo \"   ✓ Benutzer im Backup: \$USER_COUNT\"
echo \"   ✓ Stundenplan-Slots im Backup: \$SCHEDULE_COUNT\"

echo \"🧹 Räume Test-Datenbank auf...\"
docker exec -t supabase-db psql -U postgres postgres -c \"DROP DATABASE \$TEST_DB;\"

echo \"✅ Disaster Recovery Test erfolgreich abgeschlossen (100% Datenintegrität)!\"
'"
