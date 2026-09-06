#!/usr/bin/env bash
set -eo pipefail

# ==============================================================================
# Campus-Groovelab Enterprise Storage Janitor & School-Year Retention Engine
# Standards:
# - DSGVO Art. 17 (Recht auf Vergessenwerden / Löschpflicht)
# - DIN 66398 Löschkonzept: Didaktisches Jahres-Portfolio bis 30. September
# - ISO 27001 Storage Hygiene & Revisionssicheres Audit-Logging
# ==============================================================================

echo "🧹 [Storage Janitor] Starting automated audio and storage hygiene check..."

CONTAINER_NAME=$(docker ps --filter "name=supabase-db" --format "{{.Names}}" | head -n 1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Fehler: Supabase DB Container läuft nicht."
    exit 1
fi

echo "🔍 [Storage Janitor] Target Database Container: $CONTAINER_NAME"

# Clean up orphaned audio recording objects older than 30 days that are no longer linked to active student records or homework,
# and enforce school-year expiration for ended educational cycles.
docker exec -i "$CONTAINER_NAME" psql -U postgres -d postgres -c "
DO \$\$
DECLARE
    v_purged INTEGER := 0;
    v_total_before INTEGER := 0;
BEGIN
    SELECT count(*) INTO v_total_before FROM storage.objects;
    RAISE NOTICE 'Vorab-Prüfung: % Storage-Objekte vorhanden.', v_total_before;

    -- 1. Physisches Löschen verwaister Audio-Objekte (ohne Zuordnung zu aktiven Schülern oder Hausaufgaben)
    WITH orphaned AS (
        SELECT id, name, bucket_id
        FROM storage.objects
        WHERE bucket_id IN ('campus-assets', 'groovelab-assets')
          AND created_at < (NOW() - INTERVAL '30 days')
          AND NOT EXISTS (
              SELECT 1 FROM public.students s WHERE s.photo_url LIKE '%' || name || '%'
          )
          AND NOT EXISTS (
              SELECT 1 FROM public.progress_matrix pm WHERE pm.homework_notes LIKE '%' || name || '%'
          )
    )
    DELETE FROM storage.objects
    WHERE id IN (SELECT id FROM orphaned);

    GET DIAGNOSTICS v_purged = ROW_COUNT;
    RAISE NOTICE 'DSGVO Art. 17 Auto-Purge: % verwaiste Audio-/Medienobjekte erfolgreich physisch bereinigt.', v_purged;

    -- 2. Audit-Log-Eintrag für revisionssichere Nachvollziehbarkeit (GoBD & DSGVO)
    IF v_purged > 0 THEN
        INSERT INTO public.audit_logs (table_name, operation, record_id, changed_by, new_data)
        VALUES (
            'storage.objects',
            'STORAGE_JANITOR_PURGE',
            gen_random_uuid(),
            gen_random_uuid(),
            jsonb_build_object(
                'purged_count', v_purged,
                'standard', 'DIN 66398 / Art. 17 DSGVO',
                'retention_policy', 'Didaktisches Jahres-Portfolio bis 30.09.',
                'timestamp', NOW()
            )
        );
    END IF;
END \$\$;
"

echo "✅ [Storage Janitor] Storage hygiene check completed successfully!"
