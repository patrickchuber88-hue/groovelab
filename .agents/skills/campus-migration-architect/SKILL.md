---
name: campus-migration-architect
description: >-
  Autoritativer PostgreSQL-Migrations- und Datenbank-Architekt für Campus-Groovelab.
  Garantiert 100% idempotente DDL, lückenloses Multi-Tenancy Row Level Security (RLS)
  mit Default-Deny, WORM-Audit-Logging, Zero-Secret-Leakage und Zero US-Cloud Konformität.
---

# 🐘 Campus-Groovelab PostgreSQL & Migration Architect

Verwende diesen Skill, wenn neue Datenbanktabellen, Spalten, Indizes, RLS-Policies, Trigger oder Stored Procedures (RPCs) für Campus-GrooveLab entworfen, geprüft oder migriert werden.

---

## 1. Unverrückbare 0,1% Datenbank-Axiome

1. **Absolute 0% US-Cloud & Airgap-Doktrin**:
   - Keine proprietären Cloud-Funktionen (wie AWS Lambda Webhooks, Supabase US-Auth Hooks, Google Cloud Functions).
   - 100 % der DDL und DML verbleiben auf ISO/IEC 27001 zertifizierten Servern in Deutschland (Hetzner FSN1/NBG1).
2. **Mandantentrennung (Multi-Tenancy) als Default-Deny**:
   - Jede Tabelle mit Mandantenbezug MUSS `school_id UUID NOT NULL REFERENCES schools(id)` enthalten.
   - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` ist für jede neu angelegte Tabelle zwingend.
   - RLS-Policies dürfen NIEMALS pauschale `USING (true)` Bypässe enthalten. Standard ist `school_id = get_current_user_school_id()`.
3. **Idempotenz-Pflicht (Zero-Failure bei Re-Runs)**:
   - Jedes Skript muss mehrfach ausführbar sein, ohne abzubrechen:
     - `CREATE TABLE IF NOT EXISTS ...`
     - `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`
     - `CREATE INDEX IF NOT EXISTS ...`
     - `DROP POLICY IF EXISTS ... ON ...; CREATE POLICY ...`
     - `CREATE OR REPLACE FUNCTION ...`
4. **Zero-Secret-Leakage**:
   - Niemals Passwörter, PINs (`parent_pin`, `personal_pin`), TOTP-Secrets oder Recovery-Keys in lesbare Client-Views (`users_view`, `students_view`) aufnehmen.
   - Verifikation erfolgt ausnahmslos serverseitig über SECURITY DEFINER RPCs mit `search_path = public, auth`.
5. **WORM-Audit-Logging (Write Once, Read Many)**:
   - Alle administrativen Änderungen oder sensiblen Tabellen-Mutationen müssen über Trigger in `public.audit_logs` oder `master_audit_trail` protokolliert werden.

---

## 2. Standard-Template für neue Migrationen

Jede neue Datei unter `supabase/migrations/<timestamp>_<feature_name>.sql` muss dieser Architektur folgen:

```sql
-- Migration: <Name der Migration>
-- Bounded Context: [Campus (Grün) | GrooveLab (Gelb) | Admin/Billing (Rot)]
-- Ziel: <Kurzbeschreibung>

DO $$
BEGIN
    -- 1. Tabellen-Definition (Idempotent)
    CREATE TABLE IF NOT EXISTS public.example_feature_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
        created_by UUID REFERENCES public.users_raw(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
    );

    -- 2. Performance-Indizes
    CREATE INDEX IF NOT EXISTS idx_example_feature_school 
        ON public.example_feature_items(school_id);
    CREATE INDEX IF NOT EXISTS idx_example_feature_created_at 
        ON public.example_feature_items(created_at DESC);

    -- 3. RLS aktivieren
    ALTER TABLE public.example_feature_items ENABLE ROW LEVEL SECURITY;

    -- 4. RLS-Policies idempotent anlegen
    DROP POLICY IF EXISTS "tenant_isolation_select" ON public.example_feature_items;
    CREATE POLICY "tenant_isolation_select" ON public.example_feature_items
        FOR SELECT
        USING (school_id = get_current_user_school_id());

    DROP POLICY IF EXISTS "tenant_isolation_insert" ON public.example_feature_items;
    CREATE POLICY "tenant_isolation_insert" ON public.example_feature_items
        FOR INSERT
        WITH CHECK (
            school_id = get_current_user_school_id() 
            AND (created_by IS NULL OR created_by = auth.uid())
        );

    DROP POLICY IF EXISTS "tenant_isolation_update" ON public.example_feature_items;
    CREATE POLICY "tenant_isolation_update" ON public.example_feature_items
        FOR UPDATE
        USING (school_id = get_current_user_school_id())
        WITH CHECK (school_id = get_current_user_school_id());

    DROP POLICY IF EXISTS "tenant_isolation_delete" ON public.example_feature_items;
    CREATE POLICY "tenant_isolation_delete" ON public.example_feature_items
        FOR DELETE
        USING (
            school_id = get_current_user_school_id()
            AND (get_current_user_role() IN ('admin', 'school_admin'))
        );

    -- 5. Audit-Trail Trigger
    DROP TRIGGER IF EXISTS trg_audit_example_feature ON public.example_feature_items;
    CREATE TRIGGER trg_audit_example_feature
        AFTER INSERT OR UPDATE OR DELETE ON public.example_feature_items
        FOR EACH ROW EXECUTE FUNCTION public.fn_audit_trail_logger();

END $$;
```

---

## 3. Sicherheits-RPCs (Stored Procedures)

Wenn eine Operation besondere Privilegien benötigt (`SECURITY DEFINER`), MUSS folgender Sicherheitsblock vorhanden sein:

```sql
CREATE OR REPLACE FUNCTION public.execute_secure_action(
    p_school_id UUID,
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_current_school_id UUID;
    v_role TEXT;
BEGIN
    -- 1. Mandanten-Validierung
    v_current_school_id := get_current_user_school_id();
    IF v_current_school_id IS NULL OR v_current_school_id <> p_school_id THEN
        RAISE EXCEPTION '403 Forbidden: Cross-tenant access denied' USING ERRCODE = '42501';
    END IF;

    -- 2. Rollen-Prüfung
    v_role := get_current_user_role();
    IF v_role NOT IN ('admin', 'school_admin') THEN
        RAISE EXCEPTION '403 Forbidden: Insufficient administrative privileges' USING ERRCODE = '42501';
    END IF;

    -- 3. Business-Logik ausführen...
    
    RETURN jsonb_build_object('success', true);
END;
$$;
```

---

## 4. Pre-Commit Checkliste für Datenbank-Änderungen

Vor dem Freigeben einer Migration muss verifiziert werden:
- [ ] Ist die Migration idempotent (`IF NOT EXISTS`, kein Abbruch bei zweiter Ausführung)?
- [ ] Ist RLS aktiviert (`ENABLE ROW LEVEL SECURITY`)?
- [ ] Sind alle Abfragen strikt auf `school_id = get_current_user_school_id()` beschränkt?
- [ ] Wurde der `search_path` bei `SECURITY DEFINER` explizit gesetzt (`SET search_path = public, auth, pg_temp`)?
- [ ] Werden Passwörter, PINs oder Geheimnisse vor Client-SELECTs geschützt?
- [ ] Gibt es für alle Fremdschlüssel und Mandanten-Filter entsprechende B-Tree Indizes?
