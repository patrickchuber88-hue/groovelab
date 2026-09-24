---
name: campus-legacy-ingestion
description: >-
  Enterprise Ingestion Engine für Massen-Onboardings und Migrationen aus Altsystemen
  (WinMusik, MBS, Excel). Garantiert atomare PostgreSQL-Transaktionen (< 500 ms) via
  Migration 502, Zero-Payroll & Zero-Address RAM-Filterung, automatische Schüler-Pseudonymisierung
  und schlüsselfertigen Ausweisdruck für Klassen-Tablets.
---

# 📥 Campus-Groovelab Enterprise Ingestion Engine (Migration 502)

Verwende diesen Skill, wenn CSV-, TSV- oder Excel-Exporte von Musikschulen importiert, validiert oder migriert werden sollen.

## 1. Die Zero-Payroll & Zero-Adresse Doktrin
Legacy-Exporte enthalten oft sensible Spalten, die vor dem Absenden im RAM getilgt werden müssen:
* **Gesperrte Spalten (Blacklist):** `iban`, `bic`, `konto`, `gehalt`, `honorar`, `stundensatz`, `deputat`, `steuernummer`, `adresse`, `strasse`, `plz`, `ort`, `telefon`.
* **Zero-Mail für Minderjährige:** Schüler-Accounts erhalten keine E-Mail-Adressen.
* **Pseudonymisierung:** Namen werden automatisch auf das datenschutzkonforme Format `Max M.` gekürzt.

## 2. Der 2-Stufen Import-Workflow

### Stufe 1: Staging-Insert in `migration_staging_records`
Der Client bündelt validierte Schüler- oder Dozenten-Datensätze mit einer eindeutigen `batch_id` und schreibt sie in die RLS-geschützte Staging-Tabelle.

### Stufe 2: Atomarer RPC `execute_legacy_migration`
```typescript
const { data, error } = await supabase.rpc('execute_legacy_migration', {
  p_school_id: schoolId,
  p_batch_id: batchId
});
```
* **Atomarer Rollback:** Tritt in Zeile 850 ein Fehler auf, rollt PostgreSQL die gesamte Transaktion zurück (0 Datenmüll in `users_raw`).
* **Performance:** Bis zu 1.500 Datensätze werden in unter 500 Millisekunden eingespielt.

## 3. Ready-to-Play Übergabe
Nach erfolgreichem Import bietet die UI sofort den 1-Klick-Button **[ Klassen-Ausweise drucken (DIN A4) ]**, der das `DpoIdCardModal` öffnet. Die Schulleitung kann die fertigen Ausweis-Bögen mit QR-Codes und 4-Stift-PINs für den Tablet-Login direkt ausdrucken.
