# 🏛️ Implementierungsplan: 0,1% Goldstandard Master-Cockpit Refinement

## 1. Ausgangslage & Forensischer Befund
Die Überprüfung des **Master Cockpits** ([ExecutiveTab.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/masterAdmin/tabs/ExecutiveTab.tsx)) und des dazugehörigen PDF-Generators ([pdfGenerator.ts](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/pdfGenerator.ts)) ergab:
Das Board hat ein erstklassiges visuelles Grundgerüst (Apple Squircle, ruhige Kontraste, Plus Jakarta Sans), weist jedoch **5 signifikante Abweichungen vom 0,1% Goldstandard** auf:
1. **Schein-Synchronität & Hardcoded Metrics**:
   - Die Abrechnungskachel zeigt fest verdrahtet `{validSchools.length} von {validSchools.length} Schulen (100% Synchron)` und „Keine offenen Mahnungen“, ohne die Tabelle `public.invoices` abzufragen.
   - Die Kachel `API Edge Latenz` zeigt statisch `P95: 18 ms`, während Header und Radar dynamisch den echten DB-Ping (`172 ms`) anzeigen.
   - Die SLA-Kachel enthält den statischen String `HTTP 5xx: 0,00 %`.
2. **CFO-Report Diskrepanz**:
   - In [pdfGenerator.ts#L3600](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/pdfGenerator.ts#L3600) wird `activeSchools - bypassedSchools = zahlend` berechnet. Dadurch werden die 3 Schulen in Testphase im generierten CFO-PDF fälschlicherweise als voll zahlend deklariert (5 statt 2 zahlende Schulen).
3. **Extreme Redundanz (Doppelung Zeile 1 und Zeile 3)**:
   - In Zeile 1 werden MRR und ARR inklusive Aufteilung (Hosting vs. Seats vs. Add-ons) ausgewiesen.
   - In Zeile 3 links werden dieselben 3 Zahlen erneut als Riesen-Kacheln und ein viertes Mal als Gesamt-MRR-Mini-Kachel gerendert. 66 % des unteren Screens sind redundanter Leerraum ohne neuen Informationswert.
4. **Semantische Brüche & Kategoriefehler**:
   - Ein globaler Broadcast-Schalter („Kein aktiver Broadcast / Normalbetrieb aktiv“) befindet sich mitten in der Finanzkachel „Cashflow & Abrechnung“.
   - Der Button zum Aufruf der Finanzsteuerung heißt unverständlich `Raten →`.
   - Der Button `Vollständiges Logbuch & Triage öffnen` verweist auf den Zahlungsabgleich (`briefing`).
   - Die Schulen-Kachel in Zeile 1 verschweigt, was mit den verbleibenden 3 Schulen ist („2 zahlend • 0 Bypass“ bei 5 Mandanten).
5. **Zero-State-Darstellungsfehler**:
   - Bei 0 aktiven Nutzern rendert der Plattform-Puls-Balken 50 % grün / 50 % gelb und suggeriert Aktivität statt Ruhezustand.

---

## 2. Ziel-Architektur des 0,1% Goldstandard Boards

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ MASTER COCKPIT                                    [● Cluster Online] [⚡ DB: 24ms] [CFO-Report] [SLA]   │
├──────────────────────────┬──────────────────────────┬──────────────────────────┬───────────────────────┤
│ MONATLICHER UMSATZ (MRR) │ JÄHRLICHE RUN-RATE (ARR) │ SCHULEN-TRICHTER (SSOT)  │ SOFORT-TRIAGE (INBOX) │
│ 49,80 €                  │ 597,60 €                 │ 5 Mandanten              │ 0 Offen               │
│ 49,80€ Base · 0€ Seats   │ Status: Kleinuntern. 2%  │ 2 Zahlend · 3 Testphase  │ Alle synchron ✓       │
├──────────────────────────┴──────────────────────────┴──────────────────────────┴───────────────────────┤
│ RECHENZENTRUM-TELEMETRIE & PLATTFORM-PULS (ECHTZEIT)                                [Deep Telemetry →] │
│ • 0 Sessions (24h) · 0/0 Lehrer · 0/0 Schüler aktiv           [Status: Kein Lastprofil / Ruhezustand]  │
│ [CPU: 4%]    [RAM: 35%]    [DB Pool: 4/100]    [Audio-Tresor: 2.4/14 GB]    [Ping: 24 ms]    [SLA: 99.98%] │
├────────────────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ MANDANTEN- & TESTPHASEN-RADAR                          │ LIQUIDITÄT & RECHNUNGEN (OKTOBER 2026)        │
│ • Musikschule Musterstadt: Vollzahler (Campus + GL)    │ Echte Rechnungs-Aggregation aus DB:           │
│ • SoundLab Academy: Vollzahler (GrooveLab)             │ 2 von 2 fälligen Rechnungen bezahlt (100%)    │
│ • Jazzschule Nord: Testphase endet in 11 Tagen ⚠️      │ Nächster Monatsabschluss: in 16 Tagen         │
│ • Stadtakademie: Testphase endet in 28 Tagen           │ [Steuerberater-CSV Exportieren (DATEV)]       │
└────────────────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 3. Konkrete Datei-Änderungen

### Datei 1: `apps/groovelab/src/components/masterAdmin/tabs/ExecutiveTab.tsx`
1. **Schulen-Trichter Parität (Kachel 3 in Zeile 1)**:
   - Zählung von `trialSchoolsCount = validSchools.filter(s => isSchoolTrialActive(s)).length`.
   - Subtext: `${payingSchoolsCount} zahlend • ${trialSchoolsCount} Testphase${bypassedCount > 0 ? ` • ${bypassedCount} Bypass` : ''}`.
2. **Harmonisierung der Telemetrie-Kacheln**:
   - Kachel 5 (Latenz): Statt hartkodiertem `P95: 18 ms` dynamischen Wert `${liveDbLatency} ms` anzeigen mit Kennzeichnung `IONOS DB Roundtrip`.
   - Plattform-Puls Balken: Wenn `measuredCampusActive24h + measuredGroovelabActive24h === 0`, rendert der Balken einen dezenten grauen Track (`#e2e8f0`) mit Status-Label `Ruhezustand (0 Sessions)`, statt irreführend 50% grün / 50% gelb zu färben.
3. **Echtes Invoicing in „Cashflow & Abrechnung“**:
   - `useEffect`-Abfrage auf `supabase.from('invoices').select('id, status, amount, due_date')` für den aktuellen Rechnungsmonat.
   - Status: Wenn offene oder überfällige Rechnungen vorliegen, wird die echte Anzahl und Summe ausgewiesen (z. B. `1 überfällig`, statt blindem `100% Synchron`).
   - Button-Label `Raten →` korrigieren zu `Financial Control →`.
   - Broadcast-Widget aus der Cashflow-Kachel entfernen (wird im Header/Wartungsboard gesteuert).
4. **Veredelung von Zeile 3 Links: Mandanten- & Testphasen-Radar statt doppelter MRR**:
   - Ersetzen der drei redundanten Umsatzkacheln durch ein kompaktes, hochgradig nützliches **Mandanten- & Testphasen-Radar**:
     - Zeigt die Mandanten mit Modul-Icons, Status (Vollzahler, Testphase, Bypass) und für Testphasen-Schulen die Restlaufzeit (`Noch X Tage`).
     - Reagiert auf Testphasen, die in $\le 14$ Tagen ablaufen (gelber Warn-Badge für rechtzeitige Vertragsverlängerung).
5. **Bereinigung der statischen Vanity-Badges**:
   - Entfernen der 4 rein statischen Placebo-Texte (`SOC 2 / OWASP`, `DSGVO: 100%`, `Lückenloses Audit-Logging`, `100% SSOT-Parität`).
   - Triage-Link umbenennen von `Vollständiges Logbuch & Triage öffnen` zu `Zahlungsabgleich öffnen →`.

### Datei 2: `apps/groovelab/src/utils/pdfGenerator.ts`
1. **CFO-Report Berechnungs-Parität**:
   - In `generateExecutiveSummaryPDF`: Parameter `payingSchoolsCount` und `trialSchoolsCount` übergeben.
   - In [pdfGenerator.ts#L3600](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/utils/pdfGenerator.ts#L3600) den Text korrigieren auf:
     `${params.payingSchoolsCount} zahlend • ${params.trialSchoolsCount} Testphase${params.bypassedSchoolsCount > 0 ? ` • ${params.bypassedSchoolsCount} Kulanz` : ''}`.

---

## 4. Verifikations- und Qualitäts-Kriterien
1. **Keine Scheindaten**: 0 hardcodierte Latenzen, 0 Scheinsynchronitäten, 0 Placebo-Badges.
2. **100% Parität**: Screen (`2 zahlend`) stimmt exakt mit dem generierten CFO-PDF überein.
3. **Zero-State-Integrität**: 0 Aktivität wird als Ruhezustand dargestellt, nicht als 50/50-Balken.
4. **Informationsgewinn**: Betreiber sieht sofort ablaufende Testphasen und echte fällige Rechnungen.
5. **Zero-Regression**: Alle bestehenden Exports (CSV, PDF, SLA-Modal) bleiben voll funktionsfähig.
