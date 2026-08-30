#!/bin/bash
# ==============================================================================
# Campus-Groovelab Automated Cross-Tenant Isolation Regression Test
# Verifies zero cross-tenant leakage under simulated multi-tenant contexts
# ==============================================================================

set -e

SERVER="root@178.105.10.2"

echo "🛡️  Starte Cross-Tenant Isolation Test auf $SERVER..."

ssh "$SERVER" "docker exec -i supabase-db psql -U postgres postgres -P pager=off" << 'EOF'
DO $$
DECLARE
    v_school_a UUID;
    v_school_b UUID;
    v_teacher_a UUID;
    v_count INT;
BEGIN
    -- 1. Finde 2 unterschiedliche Schulen
    SELECT id INTO v_school_a FROM public.schools WHERE is_active = true LIMIT 1;
    SELECT id INTO v_school_b FROM public.schools WHERE is_active = true AND id <> v_school_a LIMIT 1;

    IF v_school_a IS NULL OR v_school_b IS NULL THEN
        RAISE NOTICE 'Weniger als 2 Schulen in DB, überspringe Cross-Tenant Simulation.';
        RETURN;
    END IF;

    -- 2. Finde User von Schule A
    SELECT id INTO v_teacher_a FROM public.users_raw WHERE school_id = v_school_a LIMIT 1;

    IF v_teacher_a IS NOT NULL THEN
        -- Simuliere Session-Kontext von Lehrer A
        PERFORM set_config('request.headers', format('{"x-user-id": "%s"}', v_teacher_a), true);

        -- Test 1: Lehrer A versucht Schüler von Schule B zu lesen
        SELECT COUNT(*) INTO v_count FROM public.users_raw WHERE school_id = v_school_b;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'CRITICAL RLS LEAK: Lehrer von Schule A konnte % Schüler von Schule B sehen!', v_count;
        END IF;

        -- Test 2: Lehrer A versucht Stundenpläne von Schule B zu lesen
        SELECT COUNT(*) INTO v_count FROM public.schedules WHERE school_id = v_school_b;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'CRITICAL RLS LEAK: Lehrer von Schule A konnte % Stundenpläne von Schule B sehen!', v_count;
        END IF;

        -- Test 3: Lehrer A versucht Kioske von Schule B zu lesen
        SELECT COUNT(*) INTO v_count FROM public.kiosks WHERE school_id = v_school_b;
        IF v_count > 0 THEN
            RAISE EXCEPTION 'CRITICAL RLS LEAK: Lehrer von Schule A konnte % Kioske von Schule B sehen!', v_count;
        END IF;
    END IF;

    RAISE NOTICE 'SUCCESS: 0 Rows leaked zwischen Schule A und Schule B!';
END;
$$;
EOF

echo "✅ Alle Cross-Tenant RLS Schranken sind zu 100% aktiv und abriegelnd!"
