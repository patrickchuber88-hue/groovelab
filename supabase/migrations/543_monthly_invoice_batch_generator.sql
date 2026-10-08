-- Migration: 543_monthly_invoice_batch_generator.sql
-- Description: Persistente monatliche Rechnungslegung (generate_monthly_school_invoices),
--              autoritative CAMT.053 Kontoauszugs-Verbuchung (reconcile_camt_bank_statement)
--              und Tilgung aller Browser-Storage / localStorage Abhängigkeiten.
-- Bounded Context: ADM-11 (B2B Billing Engine) / GoBD § 146/147 AO

-- 1. Ensure columns on public.invoices exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'invoice_number'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN invoice_number VARCHAR(100) UNIQUE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'amount_cents'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN amount_cents BIGINT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'currency'
    ) THEN
        ALTER TABLE public.invoices ADD COLUMN currency VARCHAR(10) DEFAULT 'EUR';
    END IF;
END $$;

-- 2. Server-Side Monthly Batch Generator: generate_monthly_school_invoices
CREATE OR REPLACE FUNCTION public.generate_monthly_school_invoices(
    p_year INT,
    p_month INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_school RECORD;
    v_billing_date DATE;
    v_due_date DATE;
    v_yymm TEXT;
    v_seq_num TEXT;
    v_inv_id TEXT;
    v_currency TEXT;
    
    -- Rates
    v_rate_campus NUMERIC(10, 2);
    v_rate_groovelab NUMERIC(10, 2);
    v_rate_kombi NUMERIC(10, 2);
    v_rate_teacher NUMERIC(10, 2);
    v_rate_student NUMERIC(10, 2);
    v_rate_passive NUMERIC(10, 2);
    v_storage_price NUMERIC(10, 2);
    
    -- Counts
    v_teacher_count INT := 0;
    v_campus_student_count INT := 0;
    v_groovelab_student_count INT := 0;
    v_passive_student_count INT := 0;
    v_exempt_student_count INT := 0;
    v_free_hardship_quota INT := 0;
    v_payable_exempt_count INT := 0;
    
    -- Totals
    v_base_flat NUMERIC(10, 2) := 0;
    v_teacher_fee NUMERIC(10, 2) := 0;
    v_student_fee NUMERIC(10, 2) := 0;
    v_passive_fee NUMERIC(10, 2) := 0;
    v_total_amount NUMERIC(10, 2) := 0;
    v_items JSONB;
    v_invoices_created INT := 0;
BEGIN
    IF NOT (current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Batch invoice generation requires service_role or master_admin.' USING ERRCODE = '42501';
    END IF;

    v_billing_date := make_date(p_year, p_month, 1);
    
    -- Standard-Zahlungsziel: 30 Tage netto (§ 286 Abs. 3 BGB) mit § 193 BGB Werktagsanpassung
    v_due_date := v_billing_date + 30;
    IF EXTRACT(DOW FROM v_due_date) = 6 THEN -- Samstag
        v_due_date := v_due_date + 2;
    ELSIF EXTRACT(DOW FROM v_due_date) = 0 THEN -- Sonntag
        v_due_date := v_due_date + 1;
    END IF;

    v_yymm := SUBSTRING(p_year::TEXT FROM 3 FOR 2) || LPAD(p_month::TEXT, 2, '0');

    FOR v_school IN 
        SELECT s.*, COALESCE(s.numeric_id, 1) AS num_id
        FROM public.schools s
        WHERE COALESCE(s.subscription_status, 'active') <> 'cancelled'
    LOOP
        v_currency := COALESCE(v_school.currency, 'EUR');
        
        -- Tarifsätze anhand Währung
        IF v_currency = 'CHF' THEN
            v_rate_campus := 19.90;
            v_rate_groovelab := 14.90;
            v_rate_kombi := 29.90;
            v_rate_teacher := 1.00;
            v_rate_student := 1.00;
            v_rate_passive := 0.20;
        ELSE
            v_rate_campus := 14.90;
            v_rate_groovelab := 9.90;
            v_rate_kombi := 19.90;
            v_rate_teacher := 0.49;
            v_rate_student := 0.49;
            v_rate_passive := 0.09;
        END IF;

        -- 1. Basis-Pauschale
        v_base_flat := 0;
        IF v_school.has_campus_subscription = true AND v_school.has_groovelab_subscription = true THEN
            v_base_flat := v_rate_kombi;
        ELSIF v_school.has_campus_subscription = true THEN
            v_base_flat := v_rate_campus;
        ELSIF v_school.has_groovelab_subscription = true THEN
            v_base_flat := v_rate_groovelab;
        END IF;

        -- 2. Team-Zählung (Lehrkräfte/Admin)
        SELECT COUNT(*) INTO v_teacher_count
        FROM public.users_raw
        WHERE school_id = v_school.id
          AND role IN ('teacher', 'admin', 'secretary')
          AND is_active = true;

        v_teacher_fee := ROUND(v_teacher_count * v_rate_teacher, 2);

        -- 3. Schüler-Zählungen
        SELECT 
            COUNT(*) FILTER (WHERE is_active = true AND is_campus_active = true),
            COUNT(*) FILTER (WHERE is_active = true AND is_groovelab_active = true),
            COUNT(*) FILTER (WHERE is_active = true AND is_campus_active = false AND is_groovelab_active = false),
            COUNT(*) FILTER (WHERE is_active = true AND exempt_from_direct_billing = true)
        INTO 
            v_campus_student_count,
            v_groovelab_student_count,
            v_passive_student_count,
            v_exempt_student_count
        FROM public.users_raw
        WHERE school_id = v_school.id AND role = 'student';

        v_passive_fee := ROUND(v_passive_student_count * v_rate_passive, 2);

        -- Härtefall-Quote (Floor(n/20))
        v_free_hardship_quota := FLOOR(v_campus_student_count / 20);
        v_payable_exempt_count := GREATEST(0, v_exempt_student_count - v_free_hardship_quota);

        -- Schüler-Beitrag Schule
        IF COALESCE(v_school.direct_billing_mode, 'none') = 'full' THEN
            -- Eltern zahlen Campus direkt, Schule zahlt nur GrooveLab + überhängige Härtefälle
            v_student_fee := ROUND((v_groovelab_student_count * v_rate_student) + (v_payable_exempt_count * v_rate_student), 2);
        ELSE
            -- Sammelzahler
            v_student_fee := ROUND(((v_campus_student_count + v_groovelab_student_count) * v_rate_student), 2);
        END IF;

        -- 4. Zusatzspeicher
        v_storage_price := 0;
        IF COALESCE(v_school.storage_addon_gb, 0) > 0 THEN
            IF v_currency = 'CHF' THEN
                v_storage_price := CASE 
                    WHEN v_school.storage_addon_gb <= 10 THEN 3.80
                    WHEN v_school.storage_addon_gb <= 25 THEN 6.40
                    WHEN v_school.storage_addon_gb <= 50 THEN 11.60
                    WHEN v_school.storage_addon_gb <= 100 THEN 19.40
                    ELSE 25.90
                END;
            ELSE
                v_storage_price := CASE 
                    WHEN v_school.storage_addon_gb <= 10 THEN 2.90
                    WHEN v_school.storage_addon_gb <= 25 THEN 4.90
                    WHEN v_school.storage_addon_gb <= 50 THEN 8.90
                    WHEN v_school.storage_addon_gb <= 100 THEN 14.90
                    ELSE 19.90
                END;
            END IF;
        END IF;

        v_total_amount := v_base_flat + v_teacher_fee + v_passive_fee + v_student_fee + v_storage_price;

        -- Positionen JSONB
        v_items := jsonb_build_array(
            jsonb_build_object('pos', 1, 'desc', 'Software-Bereitstellung', 'amount', 0.00),
            jsonb_build_object('pos', 2, 'desc', 'Cloud- & Server-Hosting', 'amount', v_base_flat),
            jsonb_build_object('pos', 3, 'desc', 'Service Fee Pädagogen', 'qty', v_teacher_count, 'amount', v_teacher_fee),
            jsonb_build_object('pos', 4, 'desc', 'Basis-Bereitstellung Passive Schüler', 'qty', v_passive_student_count, 'amount', v_passive_fee),
            jsonb_build_object('pos', 5, 'desc', 'Schüler-Aktivierungen', 'amount', v_student_fee),
            jsonb_build_object('pos', 6, 'desc', 'Audio-Tresor Zusatzspeicher', 'gb', COALESCE(v_school.storage_addon_gb, 0), 'amount', v_storage_price)
        );

        v_seq_num := LPAD(v_school.num_id::TEXT, 3, '0');
        v_inv_id := 'RE-' || v_seq_num || '-' || v_yymm || '-01';

        -- Persistente Rechnungslegung
        INSERT INTO public.invoices (
            id,
            invoice_number,
            school_id,
            type,
            amount,
            amount_cents,
            currency,
            status,
            billing_date,
            due_date,
            items,
            created_at
        ) VALUES (
            v_inv_id,
            v_inv_id,
            v_school.id,
            'INF',
            v_total_amount,
            ROUND(v_total_amount * 100),
            v_currency,
            'open',
            v_billing_date,
            v_due_date,
            v_items,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            amount = EXCLUDED.amount,
            amount_cents = EXCLUDED.amount_cents,
            currency = EXCLUDED.currency,
            due_date = EXCLUDED.due_date,
            items = EXCLUDED.items;

        v_invoices_created := v_invoices_created + 1;
    END LOOP;

    -- Audit-Logging
    INSERT INTO public.audit_logs (
        table_name, record_id, action, entity_type, entity_id, details
    ) VALUES (
        'invoices',
        gen_random_uuid(),
        'MONTHLY_INVOICES_BATCH_GENERATED',
        'invoices',
        v_yymm,
        jsonb_build_object(
            'period', v_yymm,
            'invoices_count', v_invoices_created,
            'billing_date', v_billing_date,
            'due_date', v_due_date,
            'legal_payment_target_days', 30
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'period', v_yymm,
        'invoices_created', v_invoices_created
    );
END;
$$;

-- 3. Autoritativer Zahlungsabgleich: reconcile_camt_bank_statement (Zero Browser-Storage)
CREATE OR REPLACE FUNCTION public.reconcile_camt_bank_statement(
    p_statement_id TEXT,
    p_transactions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_b2b_count INT := 0;
    v_b2c_count INT := 0;
    v_inv_id TEXT;
    v_b2c_ref TEXT;
    v_b2c_hash TEXT;
    v_student_id UUID;
    v_school_id UUID;
    v_student_school_id UUID;
    v_booking_date TIMESTAMPTZ;
BEGIN
    IF NOT (current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin()) THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Bank reconciliation requires service_role or master_admin.' USING ERRCODE = '42501';
    END IF;

    FOR v_tx IN SELECT * FROM jsonb_to_recordset(p_transactions) AS x(
        "id" TEXT,
        "matchedType" TEXT,
        "matchedId" TEXT,
        "amount" NUMERIC,
        "bookingDate" TEXT,
        "remittanceInfo" TEXT
    )
    LOOP
        BEGIN
            v_booking_date := (v_tx."bookingDate" || 'T12:00:00Z')::TIMESTAMPTZ;
        EXCEPTION WHEN OTHERS THEN
            v_booking_date := NOW();
        END;

        -- A. B2B Rechnungsabgleich
        IF v_tx."matchedType" = 'b2b_school' AND v_tx."matchedId" IS NOT NULL THEN
            v_inv_id := TRIM(v_tx."matchedId");

            UPDATE public.invoices
            SET 
                status = 'paid',
                paid_at = v_booking_date
            WHERE (id = v_inv_id OR invoice_number = v_inv_id)
              AND status <> 'paid'
            RETURNING school_id INTO v_school_id;

            IF FOUND THEN
                v_b2b_count := v_b2b_count + 1;
                INSERT INTO public.audit_logs (
                    school_id, table_name, record_id, action, entity_type, entity_id, details
                ) VALUES (
                    v_school_id,
                    'invoices',
                    gen_random_uuid(),
                    'B2B_INVOICE_RECONCILED_VIA_CAMT',
                    'invoices',
                    v_inv_id,
                    jsonb_build_object(
                        'statement_id', p_statement_id,
                        'matched_id', v_inv_id,
                        'amount', v_tx."amount",
                        'booking_date', v_tx."bookingDate"
                    )
                );
            END IF;

        -- B. B2C Schüler-Aktivierungsabgleich (CG-[HASH]-[YYMM])
        ELSIF v_tx."matchedType" = 'b2c_student' AND v_tx."matchedId" IS NOT NULL THEN
            v_b2c_ref := UPPER(TRIM(v_tx."matchedId"));
            -- Extrahiere Hash zwischen 'CG-' und nächstem Bindestrich
            v_b2c_hash := SUBSTRING(v_b2c_ref FROM 'CG-([A-Z0-9]+)');

            IF v_b2c_hash IS NOT NULL AND LENGTH(v_b2c_hash) >= 4 THEN
                SELECT id, school_id INTO v_student_id, v_student_school_id
                FROM public.users_raw
                WHERE role = 'student'
                  AND (
                      UPPER(REPLACE(id::TEXT, '-', '')) LIKE v_b2c_hash || '%'
                      OR UPPER(REPLACE(COALESCE(ausweis_nummer, ''), '-', '')) LIKE v_b2c_hash || '%'
                      OR UPPER(COALESCE(qr_token, '')) LIKE '%' || v_b2c_hash || '%'
                  )
                LIMIT 1;

                IF v_student_id IS NOT NULL THEN
                    UPDATE public.users_raw
                    SET 
                        is_campus_active = true,
                        payment_status = 'paid',
                        student_billing_payment_method = 'bank_transfer',
                        student_billing_cash_paid = true,
                        updated_at = NOW()
                    WHERE id = v_student_id;

                    v_b2c_count := v_b2c_count + 1;

                    INSERT INTO public.audit_logs (
                        school_id, table_name, record_id, user_id, action, entity_type, entity_id, details
                    ) VALUES (
                        v_student_school_id,
                        'users_raw',
                        v_student_id,
                        v_student_id,
                        'B2C_STUDENT_RECONCILED_VIA_CAMT',
                        'users_raw',
                        v_student_id::TEXT,
                        jsonb_build_object(
                            'statement_id', p_statement_id,
                            'reference', v_b2c_ref,
                            'amount', v_tx."amount",
                            'booking_date', v_tx."bookingDate"
                        )
                    );
                END IF;
            END IF;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'statement_id', p_statement_id,
        'b2b_reconciled', v_b2b_count,
        'b2c_reconciled', v_b2c_count
    );
END;
$$;

-- 4. Autoritatives Manuelles Bezahlt-Setzen von Rechnungen
CREATE OR REPLACE FUNCTION public.mark_invoice_as_paid(
    p_invoice_id TEXT,
    p_paid_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inv RECORD;
BEGIN
    SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id OR invoice_number = p_invoice_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Rechnung nicht gefunden.');
    END IF;

    -- Autorisierungsprüfung: Nur Master-Admin oder Admin/Sekretariat der Schule
    IF NOT (current_user IN ('postgres', 'supabase_admin', 'service_role') OR public.is_master_admin() OR (public.get_current_user_school_id() = v_inv.school_id AND public.get_current_user_role() IN ('admin', 'secretary'))) THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Keine Berechtigung zur Rechnungsänderung für diese Musikschule.');
    END IF;

    UPDATE public.invoices
    SET 
        status = CASE WHEN status = 'paid' THEN 'open' ELSE 'paid' END,
        paid_at = CASE WHEN status = 'paid' THEN NULL ELSE COALESCE(p_paid_at, NOW()) END
    WHERE id = v_inv.id;

    INSERT INTO public.audit_logs (
        school_id, table_name, record_id, action, entity_type, entity_id, details
    ) VALUES (
        v_inv.school_id,
        'invoices',
        gen_random_uuid(),
        'INVOICE_STATUS_TOGGLED',
        'invoices',
        v_inv.id,
        jsonb_build_object(
            'previous_status', v_inv.status,
            'new_status', CASE WHEN v_inv.status = 'paid' THEN 'open' ELSE 'paid' END,
            'toggled_at', NOW()
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_inv.id,
        'new_status', CASE WHEN v_inv.status = 'paid' THEN 'open' ELSE 'paid' END
    );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_monthly_school_invoices(INT, INT) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_monthly_school_invoices(INT, INT) TO service_role;

REVOKE ALL ON FUNCTION public.reconcile_camt_bank_statement(TEXT, JSONB) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_camt_bank_statement(TEXT, JSONB) TO service_role;

GRANT EXECUTE ON FUNCTION public.mark_invoice_as_paid(TEXT, TIMESTAMPTZ) TO authenticated, service_role;
