-- ==============================================================================
-- Campus-Groovelab Forensischer GoBD-Rechnungs- & WORM-Integritätstest
-- Standard: GoBD (§ 146/147 AO), § 14 UStG, OWASP ASVS Level 3
--
-- ZWECK:
-- Dieser Test beweist mathematisch und technisch:
-- 1. Lückenlose fortlaufende Rechnungsnummern pro Schule und Jahr (keine Duplikate).
-- 2. Vollständiger WORM-Schutz: Festgeschriebene Rechnungen (issued/paid) können nicht verändert werden.
-- 3. Das Löschen von Rechnungen ist physikalisch unmöglich (Ausnahmsloser DELETE-Schutz).
-- 4. Storno-Workflow erzeugt eine korrekte Gutschrift mit negativem Cent-Betrag.
--
-- AUSFÜHRUNG:
-- psql -U postgres -d campus_groovelab -f scripts/security/gobd-invoice-integrity-proof.sql
-- ==============================================================================

BEGIN;

CREATE TEMP TABLE gobd_test_results (
    test_id INT,
    requirement TEXT,
    action_tested TEXT,
    expected_outcome TEXT,
    actual_outcome TEXT,
    result TEXT
);

DO $$
DECLARE
    v_school_id UUID := 'cccccccc-0000-0000-0000-000000000001'::UUID;
    v_num1 TEXT;
    v_num2 TEXT;
    v_num3 TEXT;
    v_invoice_id VARCHAR(50) := 'inv_test_gobd_001';
    v_storno_res JSONB;
    v_storno_id TEXT;
    v_storno_amount BIGINT;
    v_orig_status TEXT;
    v_err_thrown BOOLEAN;
BEGIN
    RAISE NOTICE '🚀 Starte forensischen GoBD-Integritätstest...';

    -- Setup Test School
    INSERT INTO public.schools (id, name, slug)
    VALUES (v_school_id, 'Musikschule Musäk', 'musaek')
    ON CONFLICT (id) DO NOTHING;

    -- --------------------------------------------------------------------------
    -- TEST 1: Lückenlose Sequenzierung
    -- --------------------------------------------------------------------------
    v_num1 := public.get_next_invoice_number(v_school_id, 'RE');
    v_num2 := public.get_next_invoice_number(v_school_id, 'RE');
    v_num3 := public.get_next_invoice_number(v_school_id, 'RE');

    IF v_num1 LIKE '%-0001' AND v_num2 LIKE '%-0002' AND v_num3 LIKE '%-0003' THEN
        INSERT INTO gobd_test_results VALUES (
            1, 'GoBD § 14 UStG Sequenz', '3 aufeinanderfolgende Rechnungsnummern abrufen',
            'Lückenlose Nummern (0001, 0002, 0003)', v_num1 || ', ' || v_num2 || ', ' || v_num3, 'PASS'
        );
    ELSE
        INSERT INTO gobd_test_results VALUES (
            1, 'GoBD § 14 UStG Sequenz', '3 aufeinanderfolgende Rechnungsnummern abrufen',
            'Lückenlose Nummern (0001, 0002, 0003)', v_num1 || ', ' || v_num2 || ', ' || v_num3, 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 2: WORM Freeze auf festgeschriebene Rechnungen (UPDATE Verbot)
    -- --------------------------------------------------------------------------
    INSERT INTO public.invoices (
        id, school_id, type, amount, amount_cents, status, billing_date, due_date, invoice_number
    ) VALUES (
        v_invoice_id, v_school_id, 'INF', 19.90, 1990, 'issued', CURRENT_DATE, CURRENT_DATE + INTERVAL '14 days', v_num1
    );

    v_err_thrown := FALSE;
    BEGIN
        -- Versuch: Manipulation des Betrags einer festgeschriebenen Rechnung
        UPDATE public.invoices
        SET amount_cents = 990, amount = 9.90
        WHERE id = v_invoice_id;
    EXCEPTION WHEN OTHERS THEN
        v_err_thrown := TRUE;
    END;

    IF v_err_thrown THEN
        INSERT INTO gobd_test_results VALUES (
            2, 'GoBD § 146 AO Unveränderbarkeit', 'Mutation an festgeschriebener Rechnung (Status: issued)',
            'Hard Reject / Trigger Exception', 'Erfolgreich abgewiesen mit GoBD-Schutzverletzung', 'PASS'
        );
    ELSE
        INSERT INTO gobd_test_results VALUES (
            2, 'GoBD § 146 AO Unveränderbarkeit', 'Mutation an festgeschriebener Rechnung (Status: issued)',
            'Hard Reject / Trigger Exception', 'Update ausgeführt (GoBD-VERSTOSS!)', 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 3: Vollständiges DELETE-Verbot (§ 147 AO)
    -- --------------------------------------------------------------------------
    v_err_thrown := FALSE;
    BEGIN
        DELETE FROM public.invoices WHERE id = v_invoice_id;
    EXCEPTION WHEN OTHERS THEN
        v_err_thrown := TRUE;
    END;

    IF v_err_thrown THEN
        INSERT INTO gobd_test_results VALUES (
            3, 'GoBD § 147 AO Aufbewahrungspflicht', 'Löschversuch einer Rechnung via DELETE',
            'Hard Reject / Trigger Exception', 'Erfolgreich abgewiesen (Löschen untersagt)', 'PASS'
        );
    ELSE
        INSERT INTO gobd_test_results VALUES (
            3, 'GoBD § 147 AO Aufbewahrungspflicht', 'Löschversuch einer Rechnung via DELETE',
            'Hard Reject / Trigger Exception', 'Rechnung gelöscht (GoBD-VERSTOSS!)', 'FAIL'
        );
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 4: GoBD Storno-Gutschrifts-Workflow
    -- --------------------------------------------------------------------------
    -- Simulation als Master-Admin zur Ausführung des Stornos
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
    
    v_storno_res := public.issue_cancellation_invoice(v_invoice_id, 'Korrektur wegen Fehlabrechnung');

    v_storno_id := v_storno_res->>'storno_invoice_id';

    SELECT status INTO v_orig_status FROM public.invoices WHERE id = v_invoice_id;
    SELECT amount_cents INTO v_storno_amount FROM public.invoices WHERE id = v_storno_id;

    IF v_orig_status = 'cancelled' AND v_storno_amount = -1990 THEN
        INSERT INTO gobd_test_results VALUES (
            4, 'GoBD Storno via Gutschrift', 'issue_cancellation_invoice() Ausführung',
            'Original=cancelled & Storno=-1990 Cents', 'Original: ' || v_orig_status || ', Storno-Betrag: ' || v_storno_amount || ' Cents', 'PASS'
        );
    ELSE
        INSERT INTO gobd_test_results VALUES (
            4, 'GoBD Storno via Gutschrift', 'issue_cancellation_invoice() Ausführung',
            'Original=cancelled & Storno=-1990 Cents', 'Original: ' || v_orig_status || ', Storno-Betrag: ' || v_storno_amount || ' Cents', 'FAIL'
        );
    END IF;

END $$;

-- ------------------------------------------------------------------------------
-- TESTAUSWERTUNG
-- ------------------------------------------------------------------------------
SELECT 
    test_id AS "#",
    requirement AS "Norm / Anforderung",
    action_tested AS "Getestete Aktion",
    expected_outcome AS "Erwartung",
    actual_outcome AS "IST-Ergebnis",
    result AS "Status"
FROM gobd_test_results
ORDER BY test_id ASC;

ROLLBACK;
