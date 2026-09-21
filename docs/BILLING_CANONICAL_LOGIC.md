# 💶 Campus-Groovelab: Kanonischer Pricing-, Billing- & Rechtsleitfaden
> **Klassifizierung:** Autoritatives Finanz-, Rechts- & Rechnungs-Regelwerk (Single Source of Truth)  
> **Status:** Verbindlich für alle UI-Views, Rechnungs-PDFs, Onboarding-Wizards und Abrechnungs-RPCs  
> **Plattformbezeichnung:** Ausnahmslos **Campus-Groovelab** (mit Doppel-'o')  
> **Letzte Aktualisierung:** 2026-09-17

---

## 1. Das fundamentale Kernprinzip: Keine Software-Lizenzgebühren

> **§ 1 SaaS-Axiom:**  
> Die Kernsoftware für **Campus-Groovelab** wird Musikschulen und Nutzern **vollständig ohne Software-Lizenzgebühren** bereitgestellt (`0,00 € (Inklusive)`).  
> Es fallen ausschließlich Gebühren für das gemietete Cloud-/Server-Hosting, aktive Team-Profile sowie bewusste Schüleraktivierungen an. Wir vermieten und betreiben ausschließlich die hierfür notwendige Hochsicherheits-Infrastruktur.

---

## 2. Modul-Grundpreise & Kombi-Vorteil Bundle

Für das Basishosting der Musikschule (feste Server-Hosting-Pauschale pro Musikschule/Mandant):

| Tarif / Komponente | Monatspreis (Netto) | Leistungsumfang & Bounded Context |
|---|---|---|
| **Campus Modul** | **14,90 € / Mo.** | Didaktik, Messenger, Hausaufgaben, Schwarzes Brett, Stundenplan & Raumverwaltung |
| **GrooveLab Modul** | **9,90 € / Mo.** | WebAudio Synthesizer, Loopstation, Practice Companion, Band-Matching & DAW-Engine |
| **Kombi-Vorteil Bundle** | **19,90 € / Mo.** | Beide Module vollständig gebucht (**4,90 € / Mo. Ersparnis** gegenüber 24,80 € Einzelsumme) |
| **Service Fee (Team)** | **0,49 € / Mo.** | Pro aktivem Administrator-, Schulleiter- oder Lehrer-Profil |

---

## 3. Schüler-Aktivierungen & Gebührenlogik

### Grundsätze der Schülerabrechnung:
1. **Passive/Unregistrierte Profile sind 100% kostenlos:** Schüler-Datensätze, die in der Schülerverwaltung angelegt sind, aber keinen aktiven Zugang freigeschaltet haben, kosten **0,00 €**.
2. **Aktivierungsgebühr:** Jede bewusste Modul-Aktivierung durch einen Schüler löst eine Bereitstellungsgebühr von **0,49 € / Mo.** aus.
   - Nutzt ein Schüler sowohl Campus als auch GrooveLab aktiv, fallen 2 × 0,49 € / Mo. an.
3. **GrooveLab Sammelzahler-Garantie:**  
   > ⚠️ **Unantastbare Invariante:**  
   > GrooveLab-Aktivierungen werden **ausnahmslos und zu 100% von der Musikschule übernommen (Sammelzahler)**.  
   > Es gibt für das GrooveLab-Modul **niemals** eine Direktabrechnung mit Eltern oder Schülern!

---

## 4. Die zwei Abrechnungsmodelle im Detail

### Modell A: Musikschule übernimmt alle Kosten (Sammelzahler)
*Für Eltern und Schüler ist die Nutzung zu 100% kostenfrei.*

1. **Variable monatliche Abrechnung:**
   - Basispauschale (z. B. Kombi 19,90 € / Mo.)
   - + Team-Profile (0,49 € / Lehrer / Mo.)
   - + Aktive Schüleraktivierungen (0,49 € / aktiver Schüler / Mo.)
   - **Kostenairbag:** War ein Schüler länger als **2 Monate nicht eingeloggt**, wird das Profil automatisch inaktiviert, sodass Kosten nur bei tatsächlicher Nutzung anfallen.
2. **Jahresbeitrag bei Aktivierung (10% Rabatt):**
   - Aktive Schüler werden als Jahresbeitrag in einer gesonderten Jahresrechnung mit **10% Rabatt** abgerechnet.
3. **Einmalige Komplett-Aktivierung zum Schuljahresstart (September) (20% Rabatt):**
   - Die Musikschule aktiviert zum Schuljahresbeginn im September alle Schüler für das gesamte Schuljahr mit **20% Rabatt** auf den Schülerbeitrag.

---

### Modell B: Direktabrechnung mit Eltern/Schülern (Zahlungsüberwachung)
*Gilt AUSSCHLIESSLICH für das Campus-Modul. GrooveLab bleibt immer bei der Schule.*

> ⚖️ **Juristisches & Ökonomisches Gebot:**  
> Schüler-Direktabrechnungen dürfen **IMMER NUR als Jahresbeitragszahlung (einmalige Schuljahresgebühr)** gebucht und eingezogen werden – **NIEMALS monatlich**!  
> *Begründung:* Ein monatlicher Einzug von 0,49 € würde unverhältnismäßig hohe Banktransaktions-, Stripe- und Buchungsgebühren erzeugen.

1. **Vollständige Direktabrechnung:**
   - Einmaliger Jahresbeitrag von **maximal 5,39 € / Schuljahr** (DE/AT in EUR: 1 Monat kostenlos/Schnupperphase + bis zu 11 Monate × 0,49 €) bzw. **maximal CHF 11.00 / Schuljahr** (CH: 1 Monat kostenlos + bis zu 11 Monate × CHF 1.00).
   - Die Schule wird für alle aktivierten Campus-Schüler vollständig entlastet (**Schule zahlt 0,00 € / CHF 0.00**).
2. **Teilweise Direktabrechnung (Schule bezuschusst):**
   - Einmaliger Jahresbeitrag von **maximal 4,40 € / Schuljahr** (DE/AT: 1 Monat kostenlos + bis zu 11 Monate × 0,40 €) bzw. **maximal CHF 8.80 / Schuljahr** (CH: 1 Monat kostenlos + bis zu 11 Monate × CHF 0.80).
   - Die Schule deckt den verbleibenden Beitrag (0,09 € / CHF 0.20 / Mo.).
3. **Automatische Beendigung zum Schuljahresende (Keine Abofalle / § 309 Nr. 9 BGB):**
   - Die Beitragsperiode endet verbindlich und automatisch mit dem Ablauf des jeweiligen Schuljahres (31. Juli bzw. 31. August). Es findet **keine** stillschweigende Vertragsverlängerung und kein automatischer Einzug im Folgejahr statt.
4. **Jährlicher Probemonat (Reset zum Schuljahresbeginn):**
   - Zu Beginn eines jeden neuen Schuljahres (z. B. 1. September) wird der erste Nutzungsmonat für **alle Schüler erneut vollumfänglich kostenfrei** (Probemonat) bereitgestellt.
5. **Sanfter Rückfall in den Basistarif (0,09 € / Mo. - Keine Aussperrung):**
   - Entscheiden sich Eltern im neuen Schuljahr gegen die Zahlung des Bereitstellungsbeitrags (5,39 € / CHF 11.00), wird das Schülerprofil **zu keinem Zeitpunkt gelöscht oder der Unterricht unterbrochen**.
   - Das Profil wird automatisch in den Basistarif überführt (Basis-Unterrichtskanal zu 0,09 € / Monat), für den die Musikschule im Rahmen der Grundinfrastruktur aufkommt. Sämtliche Unterrichtstermine, Raumzuordnungen und Kontaktdaten bleiben unangetastet.
6. **Härtefall- & Geschwisterausnahmen (Einzelübernahme durch Schule):**
   - Einzelne Schüler können in der Schülerverwaltung jederzeit manuell als Härtefall oder Geschwisterkind markiert werden (`exempt_from_direct_billing = true`).
   - In diesem Fall entfällt der Zahlungsdialog bei den Eltern vollständig; das Profil wird unmittelbar für das gesamte Schuljahr freigeschaltet.
7. **Verbraucherschutz & Widerruf (§ 356 Abs. 5 BGB):**
   - Mit Beginn der digitalen Nutzung vor Ablauf der gesetzlichen 14-tägigen Widerrufsfrist stimmt der Erziehungsberechtigte der sofortigen Ausführung zu und nimmt zur Kenntnis, dass das Widerrufsrecht bei vollständiger Bereitstellung digitaler Inhalte erlischt. Keine Rückforderungs- oder Mahnschleifen.
8. **Härtefall-Stufenstaffel & Freikontingent (Sozial-Governance):**
   - **Mathematische Formel:** $\text{Freikontingent} = \left\lfloor \frac{n_{\text{Vollzahler}}}{20} \right\rfloor$
   - Es müssen mindestens 20 aktivierte Vollzahler-Schülerprofile vorliegen, bevor der erste kostenfreie Härtefallplatz gewährt wird.
   - Jede weitere volle 20 aktivierte Schüler schaltet genau einen weiteren Freiplatz frei (strikte kaufmännische Abrundung / Floor-Logik):
     - **0 bis 19 Vollzahler:** 0 Freiplätze (Einstiegsschwelle nicht erreicht)
     - **20 bis 39 Vollzahler:** 1 Freiplatz (100 % beitragsfrei für Schule & Eltern)
     - **40 bis 59 Vollzahler:** 2 Freiplätze (100 % beitragsfrei für Schule & Eltern)
     - **60 bis 79 Vollzahler:** 3 Freiplätze (100 % beitragsfrei für Schule & Eltern)
     - **80 bis 99 Vollzahler:** 4 Freiplätze (100 % beitragsfrei für Schule & Eltern)
     - **100 bis 119 Vollzahler:** 5 Freiplätze (100 % beitragsfrei für Schule & Eltern)
   - **Stichtags-Prinzip zum 1. Oktober:**
     - Da der September für alle Schüler und Eltern der kostenlose Probemonat ist, wird das Freikontingent erst am **1. Oktober** (nach Abschluss aller Nachzügler-Anmeldungen) final festgestellt.
   - **Überhang-Kaskade bei Schülerrückgang (Verbot pädagogischer Willkür / § 242 BGB, Art. 3 GG):**
     - Sinkt die Zahl der Vollzahler im Folgejahr (z. B. von 100 auf 70), verbleiben die bisherigen Härtefall-Kinder zu 100 % aktiv und ungesperrt.
     - Für die über das Kontingent hinausgehenden Schüler (Überhang) übernimmt die Musikschule den regulären Jahresbereitstellungsbeitrag (5,39 € / Schuljahr bzw. 0,49 € / Mo.) auf ihrer B2B-Rechnung.
     - Die Schule kann Überhang-Profile vor dem 1. Oktober aktiv auf den Basistarif (0,09 € / Mo.) zurückstufen, falls ein Schüler die Schule verlassen hat. Ein willkürlicher Schülerausschluss durch das System findet zu keinem Zeitpunkt statt.

---

## 5. Verbindliche kanonische Abrechnungsreihenfolge (Master-Wording)

Für alle Gebührenaufstellungen, Vorschau-Modals, PDF-Rechnungen und Onboarding-Dialoge auf der gesamten Plattform gilt verbindlich exakt folgende Reihenfolge:

```
1. Campus-Groovelab Software-Bereitstellung:  0,00 € (Inklusive)
2. Cloud- & Datenbank-Hosting (Basispauschale):
   - Campus Modul:                            14,90 € / Mo.
   - GrooveLab Modul:                          9,90 € / Mo.
   - Kombi-Vorteil Bundle:                    19,90 € / Mo.
3. Pädagogen- & Verwaltungslizenzen:          0,49 € / aktives Team-Profil / Mo.
4. Schüler-Aktivierungen:
   - Campus Schüleraktivierung:               0,49 € / Mo. (oder Jahresbeitrag via Eltern)
   - GrooveLab Schüleraktivierung:            0,49 € / Mo. (100% Sammelzahler durch Schule)
```

---

## 6. Währungs- & Ländermatrix

| Land / Region | Währung | Schülerbeitrag monatlich | Max. Jahresbeitrag Direktabrechnung |
|---|---|---|---|
| **Deutschland (DE)** | **EUR (€)** | 0,49 € / Mo. | **5,39 € / Schuljahr** (11 × 0,49 €) |
| **Österreich (AT)** | **EUR (€)** | 0,49 € / Mo. | **5,39 € / Schuljahr** (11 × 0,49 €) |
| **Schweiz (CH)** | **CHF** | CHF 1.00 / Mo. | **CHF 11.00 / Schuljahr** (11 × CHF 1.00) |

---

## 7. Audit- & Compliance-Klausel (DSGVO & FinTech)

- Alle Rechnungsgenerierungen, Zahlungsstatus-Änderungen und Tarifwechsel müssen unveränderlich in `public.audit_logs` mit Zeitstempel und Schul-ID protokolliert werden.
- Bei Schüler-Direktabrechnung werden Zahlungsdaten niemals auf eigenen Servern gespeichert, sondern ausschließlich über zertifizierte PCI-DSS Level 1 Zahlungsdienstleister abgewickelt.

---

## 8. GoBD-Rechnungslegung, WORM-Unveränderbarkeit & Stornoregeln (§§ 146/147 AO, § 14 UStG)

1. **Lückenlose Rechnungsnummern-Sequenz:**
   - Jede Rechnung erhält eine thread-sicher vergebene Rechnungsnummer im Format `{PREFIX}-{YEAR}-{SCHOOL_CODE}-{0001}` (z. B. `RE-2026-MUSA-0001`).
   - Sequenzen werden atomar über `invoice_sequences` vergeben; Nummernkreise weisen nach § 14 Abs. 4 Nr. 4 UStG weder Lücken noch Duplikate auf.
2. **GoBD-WORM-Unveränderbarkeit (Freeze):**
   - Rechnungen im Status `issued`, `paid` oder `cancelled` sind per Datenbanktrigger `trg_protect_gobd_invoices` physisch gegen jegliche `UPDATE`-Mutationen an Beträgen, Daten oder Positionen geschützt.
   - Ein physisches `DELETE` von Rechnungsdatensätzen ist nach § 147 AO absolut unzulässig.
3. **Korrekturen ausschließlich via Stornorechnung / Gutschrift:**
   - Fehlerhafte Rechnungen werden nicht gelöscht, sondern über `issue_cancellation_invoice()` storniert.
   - Die Funktion erzeugt eine gegenbuchungsfähige Gutschrift (Typ `STORNO`) mit negativem Cent-Betrag (`-amount_cents`), eigener Rechnungsnummer und Verknüpfung zur Originalrechnung (`canceled_invoice_id`).
4. **Cent-Arithmetik (Integer):**
   - Beträge werden in der Datenbank und in Zod-Schnittstellen ausnahmslos als ganzzahlige Cent-Beträge (`amount_cents BIGINT`) gespeichert, um Rundungsverluste aus Floating-Point-Zahlen physikalisch auszuschließen.
5. **Umsatzsteuerbefreiung:**
   - Rechnungen weisen standardmäßig den Vermerk *„Steuerbefreit gem. § 4 Nr. 21 UStG (Musikschulunterricht)“* aus.
6. **Kalendermäßiges Zahlungsziel & Werktags-Klausel (§§ 286, 193 BGB):**
   - Das formelle Zahlungsziel auf Rechnungen ist auf **14 Tage** festgesetzt (Begründung der rechtlichen Fälligkeit).
   - Fällt der 14. Tag auf ein Wochenende (Samstag/Sonntag) oder einen gesetzlichen Feiertag, verschiebt sich die Fälligkeit gemäß § 193 BGB automatisch auf den nächsten Werktag (Montag).
7. **EPC-GiroCode (Europäischer QR-Standard):**
   - Jede Rechnung enthält den offiziellen EPC-QR-Code (European Payments Council) zur beleglosen 1-Scan-Zahlung in Banking-Apps.
   - Bankverbindung des Plattformbetriebs: *Campus-Groovelab Plattformbetrieb*, IBAN `DE89 3704 0044 0532 9482 11`, BIC `GENODEFFXXX`.
8. **Didaktische Immunität & Schonfristen (§ 242 BGB):**
   - Musikschulen erhalten eine reale **Basis-Schonfrist von 28 Tagen (4 Wochen)** und in den Monaten Juli/August ein **Sommer-Moratorium von 42 Tagen (6 Wochen)**.
   - Schüler und Lehrkräfte werden bei Zahlungsverzug niemals gesperrt (didaktische Immunität).
   - Erst ab Tag 44 greift ein administrativer Schreibschutz im Sekretariat, der per 48h-Vertrauenspass oder Master-Kulanzjoker jederzeit entsperrt werden kann.

---

## 9. 1% Goldstandard B2B-Rechnungsversand & GoBD-Zustellungs-Engine

1. **Hermetischer B2C Air-Gap vs. B2B-Souveränität:**
   - Schüler, Eltern und Lehrkräfte verbleiben ausnahmslos in der **Zero-Mail-Architektur** (DSGVO Art. 25/32).
   - Plattformrechnungen von Campus-Groovelab werden ausschließlich an die offizielle, behördliche/institutionelle E-Mail-Adresse der Musikschule (`public.schools.billing_email`) zugestellt.
2. **Kryptografischer Hash-Nachweis (SHA-256):**
   - Jede Rechnung wird vor dem Versand als PDF gerendert und mit einem kryptografischen SHA-256 Hash signiert.
   - Der SHA-256 Hash wird im unveränderbaren Zustellbuch `public.school_invoice_dispatches` festgeschrieben.
3. **WORM-Zustellungsbuch (`public.school_invoice_dispatches`):**
   - Jede Rechnungsübermittlung wird mit `invoice_id`, `school_id`, `recipient_email`, `dispatched_at`, `status` (`delivered`, `simulated`, `failed`), `smtp_message_id` und `pdf_sha256` protokolliert.
   - Per Trigger `trg_protect_school_invoice_dispatches` sind Löschungen (`DELETE`) und Manipulationen (`UPDATE`) gesetzlich verboten gem. § 147 AO.
4. **Sovereign Hetzner SMTP & Dualer Zustellungs-Modus:**
   - Primärer Versandweg: Autoritatives deutsches SMTP-Relay über Hetzner Mailhost (`mail.your-server.de`, Port 587/465, TLS 1.3) via Supabase Edge Function `dispatch-school-invoice`.
   - Bei fehlenden Secrets oder im Dev-Modus: Automatischer, deterministischer Testlauf-Modus (`status: 'simulated'`).
   - Sekundärer Notfall-Rettungsschirm: Der manuelle Download inklusive Zwischenablage-Text und `mailto:`-Workflow bleibt zu 100 % erhalten.
