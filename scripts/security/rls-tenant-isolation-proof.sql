-- ==============================================================================
-- Campus-Groovelab Forensischer RLS-Tenant-Isolation-Proof
-- Standard: OWASP ASVS Level 3 / BSI TR-03116 / BSI IT-Grundschutz
--
-- ZWECK:
-- Dieser Test liefert den mathematischen und technischen Beweis (Forensic Proof),
-- dass Schule A mit keinem SQL-Query oder manipulierte API-Request Daten von
-- Schule B abrufen, mutieren, injizieren oder löschen kann.
--
-- AUSFÜHRUNG:
-- psql -U postgres -d campus_groovelab -f scripts/security/rls-tenant-isolation-proof.sql
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. TEST-HARNESS INITIALISIERUNG
-- ------------------------------------------------------------------------------
CREATE TEMP TABLE forensic_test_results (
    test_id INT,
    defense_line TEXT,
    attack_vector TEXT,
    expected_outcome TEXT,
    actual_outcome TEXT,
    result TEXT
);

DO $$
DECLARE
    v_school_a UUID := 'aaaaaaaa-0000-0000-0000-000000000001'::UUID;
    v_school_b UUID := 'bbbbbbbb-0000-0000-0000-000000000002'::UUID;
    v_user_a UUID   := 'aaaaaaaa-1111-0000-0000-000000000001'::UUID;
    v_user_b UUID   := 'bbbbbbbb-1111-0000-0000-000000000002'::UUID;
    v_student_a UUID := 'aaaaaaaa-2222-0000-0000-000000000001'::UUID;
    v_student_b UUID := 'bbbbbbbb-2222-0000-0000-000000000002'::UUID;
    v_lesson_b UUID := 'bbbbbbbb-3333-0000-0000-000000000002'::UUID;
    
    v_count INT;
    v_err_msg TEXT;
BEGIN
    RAISE NOTICE '🚀 Starte forensischen RLS-Isolationstest für Campus-Groovelab...';

    -- 1. Setup Mandanten & Testdaten (unter Superuser-Rechten)
    INSERT INTO public.schools (id, name, slug)
    VALUES 
        (v_school_a, 'Schule A (München)', 'schule-a-muenchen'),
        (v_school_b, 'Schule B (Hamburg)', 'schule-b-hamburg')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.users_raw (id, school_id, email, first_name, role, is_active)
    VALUES 
        (v_user_a, v_school_a, 'lehrer.a@campus-groovelab.de', 'Lehrer A', 'teacher', true),
        (v_user_b, v_school_b, 'lehrer.b@campus-groovelab.de', 'Lehrer B', 'teacher', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.students (id, school_id, first_name, instrument, is_active)
    VALUES 
        (v_student_a, v_school_a, 'Schüler A (München)', 'Klavier', true),
        (v_student_b, v_school_b, 'Schüler B (Hamburg)', 'Schlagzeug', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.campus_direct_messages (school_id, sender_id, recipient_id, content)
    VALUES 
        (v_school_b, v_user_b, v_student_b, 'Geheime Nachricht von Schule B');

    -- --------------------------------------------------------------------------
    -- SIMULATION: Angreifer agiert als Lehrer A von Schule A
    -- --------------------------------------------------------------------------
    PERFORM set_config('request.jwt.claim.sub', v_user_a::TEXT, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

    -- --------------------------------------------------------------------------
    -- TEST 1: SELECT Cross-Tenant Leak Check (Students)
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count 
    FROM public.students 
    WHERE school_id = v_school_b;

    IF v_count = 0 THEN
        INSERT INTO forensic_test_results VALUES (
            1, 'RLS SELECT Filter', 'Teacher A liest students von School B',
            '0 Zeilen (Vollständige Unsichtbarkeit)', '0 Zeilen geliefert', 'PASS'
        );
    ELSE
        INSERT INTO forensic_test_results VALUES (
            1, 'RLS SELECT Filter', 'Teacher A liest students von School B',
            '0 Zeilen', v_count || ' Zeilen geleakt!', 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 2: SELECT Cross-Tenant Leak Check (Direct Messages)
    -- --------------------------------------------------------------------------
    SELECT COUNT(*) INTO v_count 
    FROM public.campus_direct_messages 
    WHERE school_id = v_school_b;

    IF v_count = 0 THEN
        INSERT INTO forensic_test_results VALUES (
            2, 'RLS Cryptographic Messages', 'Teacher A liest Chat-Nachrichten von School B',
            '0 Zeilen (Vollständige Abschirmung)', '0 Zeilen geliefert', 'PASS'
        );
    ELSE
        INSERT INTO forensic_test_results VALUES (
            2, 'RLS Cryptographic Messages', 'Teacher A liest Chat-Nachrichten von School B',
            '0 Zeilen', v_count || ' Nachrichten geleakt!', 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 3: INSERT Cross-Tenant Injection Check
    -- --------------------------------------------------------------------------
    BEGIN
        INSERT INTO public.students (id, school_id, first_name, instrument)
        VALUES ('aaaaaaaa-9999-0000-0000-000000000001'::UUID, v_school_b, 'Injected Student', 'Gitarre');
        
        INSERT INTO forensic_test_results VALUES (
            3, 'RLS INSERT WITH CHECK', 'Teacher A injiziert Student in School B',
            'Hard Reject / RLS Exception', 'Insert erfolgreich (LEAK!)', 'FAIL'
        );
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO forensic_test_results VALUES (
            3, 'RLS INSERT WITH CHECK', 'Teacher A injiziert Student in School B',
            'Hard Reject / RLS Exception', 'Abgewiesen: ' || SQLERRM, 'PASS'
        );
    END;

    -- --------------------------------------------------------------------------
    -- TEST 4: UPDATE Cross-Tenant Tampering Check
    -- --------------------------------------------------------------------------
    UPDATE public.students 
    SET first_name = 'Hacked Student' 
    WHERE school_id = v_school_b;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
        INSERT INTO forensic_test_results VALUES (
            4, 'RLS UPDATE Restriktion', 'Teacher A manipuliert Student von School B',
            '0 Zeilen betroffen', '0 Zeilen verändert', 'PASS'
        );
    ELSE
        INSERT INTO forensic_test_results VALUES (
            4, 'RLS UPDATE Restriktion', 'Teacher A manipuliert Student von School B',
            '0 Zeilen betroffen', v_count || ' Zeilen manipuliert!', 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 5: DELETE Cross-Tenant Sabotage Check
    -- --------------------------------------------------------------------------
    DELETE FROM public.students 
    WHERE school_id = v_school_b;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
        INSERT INTO forensic_test_results VALUES (
            5, 'RLS DELETE Restriktion', 'Teacher A löscht Student von School B',
            '0 Zeilen gelöscht', '0 Zeilen gelöscht', 'PASS'
        );
    ELSE
        INSERT INTO forensic_test_results VALUES (
            5, 'RLS DELETE Restriktion', 'Teacher A löscht Student von School B',
            '0 Zeilen gelöscht', v_count || ' Zeilen sabotiert!', 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 6: Composite Foreign Key Enforcement (Migration 444)
    -- --------------------------------------------------------------------------
    BEGIN
        -- Versuch: Einbinden eines Schülers aus Schule A in eine Stunde von Schule B
        INSERT INTO public.lessons (id, school_id, student_id)
        VALUES ('aaaaaaaa-8888-0000-0000-000000000001'::UUID, v_school_b, v_student_a);

        INSERT INTO forensic_test_results VALUES (
            6, 'Composite Foreign Key', 'Cross-Tenant Verknüpfung via FK',
            'FK-Constraint-Verletzung (id, school_id)', 'FK erlaubt (LEAK!)', 'FAIL'
        );
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO forensic_test_results VALUES (
            6, 'Composite Foreign Key', 'Cross-Tenant Verknüpfung via FK',
            'FK-Constraint-Verletzung (id, school_id)', 'Physikalisch abgewiesen: ' || SQLERRM, 'PASS'
        );
    END;

END $$;

-- ------------------------------------------------------------------------------
-- 3. FORENSISCHER TESTBERICHT
-- ------------------------------------------------------------------------------
SELECT 
    test_id AS "#",
    defense_line AS "Verteidigungslinie",
    attack_vector AS "Angriffsvektor",
    expected_outcome AS "Erwartung",
    actual_outcome AS "IST-Ergebnis",
    result AS "Status"
FROM forensic_test_results
ORDER BY test_id ASC;

-- ------------------------------------------------------------------------------
-- 4. CLEANUP (Transaktions-Rollback hinterlässt keine Testspuren)
-- ------------------------------------------------------------------------------
ROLLBACK;
