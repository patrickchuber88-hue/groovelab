# ADR-002: Ausschließlich Jahresbeitragszahlung bei Schüler-Direktabrechnung

- **Status:** Akzeptiert (Kanonische Billing-Invariante)
- **Datum:** 2026-08 / Re-zertifiziert 2026-09
- **Domäne:** Admin / Billing & Finanzen

---

## Kontext & Problemstellung
Bei der Abrechnung von **Campus-Groovelab** stehen Musikschulen zwei Modelle für die Schüleraktivierungen zur Verfügung:
1. **Sammelzahler (Musikschule trägt alle Kosten):** Monatliche variable Abrechnung nach Nutzung (0,49 € / aktiver Schüler).
2. **Direktabrechnung mit Eltern/Schülern (nur für das Campus-Modul verfügbar):** Die Eltern tragen den Unkostenbeitrag direkt.

Würde man bei der Direktabrechnung monatliche Beträge von 0,49 € / Monat über Kreditkarte oder SEPA-Lastschrift einziehen, entstünden pro Transaktion feste Payment-Provider-Gebühren von ca. 0,25 € bis 0,35 € plus Prozentsatz. Dies würde die Transaktion unwirtschaftlich machen und bei Eltern zu Frust über unzählige Minibuchungen auf dem Kontoauszug führen.

---

## Entscheidung
1. **Ausschließliche Jahresbeitragszahlung:** Schüler-Direktabrechnungen dürfen **immer nur als einmalige Schuljahresgebühr (Jahresbeitrag)** gebucht und eingezogen werden – **niemals monatlich**.
2. **Gebühren-Obergrenze:**
   - Deutschland / Österreich: Maximal 5,39 € / Schuljahr (1 Probemonat kostenlos + bis zu 11 Monate × 0,49 €).
   - Schweiz: Maximal CHF 11.00 / Schuljahr (1 Probemonat kostenlos + bis zu 11 Monate × CHF 1.00).
3. **GrooveLab-Ausschuss:** GrooveLab-Aktivierungen verbleiben **immer zu 100% bei der Musikschule als Sammelzahler**. Eine Direktabrechnung von GrooveLab an Eltern ist technisch und vertraglich ausgeschlossen.
4. **Härtefall-Klausel:** Einzelne Schüler können in der Verwaltung als Härtefall markiert werden; ihre Kosten verbleiben bei der Musikschule, kein Einzug bei den Eltern.

---

## Konsequenzen & Invarianten für den Code
- In `BillingDashboard.tsx` und allen Zahlungs-Modals darf es bei Direktabrechnung keinen Monats-Toggle geben.
- Backend-Stripe/SEPA-Hooks müssen jeden Versuch eines monatlichen Schüler-Direkteinzugs mit einem Validierungsfehler abweisen.
