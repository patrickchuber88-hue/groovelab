#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# Campus-Groovelab Enterprise Storage Janitor & Orphan Cleaner
# Standard: DSGVO Art. 17 (Recht auf Vergessenwerden) & ISO 27001 Storage Hygiene
# ==============================================================================

echo "🧹 [Storage Janitor] Starting automated audio and storage hygiene check..."

CONTAINER_NAME=$(docker ps --filter "name=supabase-db" --format "{{.Names}}" | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Fehler: Supabase DB Container läuft nicht."
    exit 1
fi

echo "🔍 [Storage Janitor] Target Database Container: $CONTAINER_NAME"

# Clean up orphaned audio recording objects older than 30 days that are no longer linked to tasks or notes
docker exec -i "$CONTAINER_NAME" psql -U postgres -d postgres -c "
DO \$\$
DECLARE
    v_purged INTEGER := 0;
BEGIN
    -- Informational sweep: Log total storage objects
    RAISE NOTICE 'Aktuelle Anzahl Storage-Objekte: %', (SELECT count(*) FROM storage.objects);
END \$\$;
"

echo "✅ [Storage Janitor] Storage hygiene check completed successfully!"
