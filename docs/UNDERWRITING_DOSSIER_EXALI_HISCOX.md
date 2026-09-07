# 🛡️ Underwriting- & Antrags-Dossier: IT-Haftpflicht & Cyber-Risk
**Plattform:** Campus-Groovelab (https://campus-groovelab.de)  
**Antragsteller:** Patrick Huber, Softwareentwicklung & Cloud-Dienstleistungen (Einzelunternehmen)  
**Zweck:** Offizielle Selbstauskunft & Risikoprofil zur Vorlage bei Assekuradeuren / Versicherern (**exali.de / Markel Insurance SE** bzw. **Hiscox Net-IT**)  
**Gültigkeitsstand:** September 2026  

---

## 1. Stammdaten des Versicherungsnehmers & Unternehmensprofil

| Parameter | Offizielle Angabe für Antragsformular |
| :--- | :--- |
| **Name des Versicherungsnehmers** | Patrick Huber |
| **Firma / Unternehmensbezeichnung** | Patrick Huber Softwareentwicklung & Cloud-Dienstleistungen (Plattform Campus-Groovelab) |
| **Rechtsform** | Einzelunternehmen (nicht im Handelsregister eingetragen / Freiberufler/Gewerbe) |
| **Anschrift** | Karl-Fürstenberg-Str. 59, 79618 Rheinfelden (Baden), Deutschland |
| **Kontakt** | E-Mail: kontakt@campus-groovelab.de / patrick.huber@musaek.de |
| **Website** | https://campus-groovelab.de |
| **Gründungsdatum / Tätigkeitsbeginn** | Bestandsbetrieb seit mehreren Monaten/Jahren (Rechtfertigung unbegrenzte Rückwärtsdeckung) |
| **Aktueller / Geplanter Jahresumsatz** | **Stufe 1 (bis 50.000 €)** (Kleinunternehmerregelung gem. § 19 UStG) |
| **Anzahl Mitarbeiter** | 1 (Inhaber); keine fest angestellten Arbeitnehmer |
| **Geographischer Wirkungsbereich** | **DACH-Region:** Deutschland (DE), Österreich (AT), Schweiz (CH). *Weltweiter Schutz ohne USA/Kanada (bzw. inklusive Schweiz) erforderlich.* |

---

## 2. Detaillierte Tätigkeitsbeschreibung (SaaS- & Plattform-Scope)

### A. Gegenstand der gewerblichen Tätigkeit
Bereitstellung, Hosting, Weiterentwicklung und Wartung der cloudbasierten Schulmanagement- und Übeplattform **Campus-Groovelab** im Rahmen von Software-as-a-Service (SaaS)-Mietverträgen (§ 535 BGB).

### B. Funktionsumfang der Software
1. **Pädagogisches Modul Campus (Grün):** 
   - Digitales Hausaufgabenheft & Schüler-Protokoll
   - Meisterwerk-Dokumentation & Bildungsbiografie (reine Leistungs-Metadaten)
   - Didaktischer Übe-Timer / Fokus-Timer & Gamification (XP-Punkte, Streaks)
   - Didaktische Audio-Loopstation & Übe-Studio für Schüler/Lehrkräfte
   - Stundenplan-Designer & Raumbelegungs-Planung (Raum-Engine)
   - Interne Schulkommunikation (asynchrones Shouts-System / geschlossener Chat)
2. **Band- & Ensemble-Modul GrooveLab (Gelb):**
   - Band-Verwaltung & Repertoire-Planer
   - Song-Bibliotheken (reine bibliografische Metadaten gem. § 60a UrhG / Art. 19 URG)
   - Live Lab (Echtzeit-Band-Modul)
3. **Event Coordinator (Veranstaltungsplanung – ROADMAP):**
   - Zukünftig geplantes Modul für Ablauf- und Bühnenplanung von Schulkonzerten (`campus_events`); derzeit **noch nicht im Live-Betrieb implementiert** (reine Roadmap-Planung).

### C. Kundengruppen & Vertragspartner
- **B2B-Kunden:** Kommunale Schulträger, öffentlich-rechtliche und private Musikschulen, Bildungsträger (Vertragstyp: SaaS-Mietvertrag + AVV gem. Art. 28 DSGVO).
- **B2C-Nutzer:** Erziehungsberechtigte von Musikschülern (Vertragstyp: Jahresbeitrags-Aktivierungsvereinbarung mit 1-Monat-Kostenfreiem Schnuppermonat gem. § 312k BGB).

---

## 3. Risikoprüfungs-Fragen & Vorformulierte Antworten (Self-Assessment)

### Frage 1: Werden fremde Daten oder Systeme gehostet / verwaltet (Cloud/SaaS)?
> **Antwort: JA.**  
> **Erläuterung:** Bereitstellung einer mandantentrennten Multi-Tenant-SaaS-Plattform. Die tatsächliche Server- und Rechenzentrumsinfrastruktur wird zu 100 % in ISO/IEC 27001-zertifizierten deutschen Rechenzentren der **Hetzner Online GmbH** (Falkenstein/Vogtland & Nürnberg) angemietet.

### Frage 2: Werden Kreditkarten-, Bank- oder sonstige Zahlungsdaten verarbeitet/gespeichert?
> **Antwort: NEIN.**  
> **Erläuterung:** Die Plattform speichert zu 0 % Bankverbindungen, SEPA-Mandate, Kreditkartennummern oder sensible Zahlungsdaten. B2B-Rechnungen an Schulträger werden per Banküberweisung beglichen. Schüler-Direktabrechnungen erfolgen extern oder per schulischer Sammelrechnung. Volle PCI-DSS-Entbehrlichkeit.

### Frage 3: Werden besonders sensible personenbezogene Daten (Art. 9 DSGVO / Minderjährige) verarbeitet?
> **Antwort: JA (Daten von Minderjährigen), aber KEINE biometrischen Daten.**  
> **Erläuterung:**
> - Die Plattform wird von Schülern ab 6 Jahren genutzt.
> - **Datensparsamkeit:** Keine E-Mail-Adressen von Minderjährigen. Authentifizierung erfolgt tokenbasiert (QR-Schulausweis / Passkeys / PBKDF2-gehashte PINs).
> - **Namensmaskierung:** Schülernamen werden auf allen Lehrer-Dashboards datenschutzkonform gekürzt („Vorname + 1. Buchstabe des Nachnamens“).
> - **Audioaufnahmen:** Dienen ausschließlich didaktischem Feedback. Es findet **keine Stimmbiometrie**, keine Spracherkennung und kein KI-Voice-Profiling statt.
> - **Eltern-Consent:** Mikrofonfunktion erfordert elterliche Freigabe im Elternbereich (`parent_allow_audio: true`).

### Frage 4: Werden urheberrechtlich geschützte Inhalte (Noten, MP3s, Videos) gehostet?
> **Antwort: EINGESCHRÄNKT / NUR SCHÜLER-EIGENAUFNAHMEN (DIDAKTISCHE COVER-VERSIONEN IM PRIVATEN KREIS).**  
> **Erläuterung:**  
> - **Keine Verlagsnoten oder kommerziellen Original-MP3s:** Die Plattform speichert, hostet und vervielfältigt **zu 0 % urheberrechtlich geschützte Noten-PDFs, Leadsheets, Verlags-Partituren** oder kommerzielle Original-Masteraufnahmen/Audiodateien von Plattenlabels. Die Mediathek verarbeitet für Lehrwerke rein bibliografische Metadaten (Songtitel, Komponist, Lehrbuchtitel, Seitenzahlen) und Verlinkungen zu autorisierten Streaming-Diensten (Spotify, YouTube, Tomplay).  
> - **Didaktische Schüler-Audioaufnahmen (Cover-Versionen):** Gehostet werden ausschließlich von den Schülern selbst im Rahmen des Instrumentalunterrichts oder beim häuslichen Üben eingespielte Audioaufnahmen (didaktische Cover-Versionen von Übestücken).  
> - **Privilegierter, nicht-öffentlicher Kreis (§ 53, § 60a UrhG):** Diese Aufnahmen dienen rein didaktischen Zwecken zur Lernfortschrittskontrolle mit der Lehrkraft (§ 60a UrhG) sowie dem Anhören und Teilen im engsten privaten Familienkreis (§ 53 Abs. 1 UrhG / gesetzliche Privatkopie). Es existiert **keine öffentliche Mediathek, kein öffentliches Streaming und keine freie Auffindbarkeit im Internet**. Der Zugriff ist strikt auf das persönliche, PIN-geschützte Schüler- und Elternprofil beschränkt.  
> - **DSA-Meldeverfahren:** Ein elektronisches Melde- und Abhilfeverfahren (Notice-and-Takedown gem. Art. 6 & 16 Digital Services Act / DSA) an `copyright@campus-groovelab.de` ist live aktiv.

### Frage 5: Wie hoch ist die vertraglich zugesicherte Verfügbarkeit (SLA)?
> **Antwort: 99,5 % im Jahresmittel.**  
> **Erläuterung:** Gemäß § 1 Abs. 5 der B2B-AGB garantiert der Betreiber 99,5 % Verfügbarkeit (ausgenommen angekündigte Wartungsfenster). Bei Ausfällen greift die in den AGB verankerte **Nachrangigkeits- und Notfallklausel**: Der reguläre Musikschulunterricht findet offline statt; Campus-Groovelab ist ein didaktisches Zusatzsystem, kein behördliches Notfallmeldemedium.

---

## 4. Technisch-Organisatorische Maßnahmen (TOMs gem. Art. 32 DSGVO)

| Schutzdimension | Implementierte technische Maßnahme | Nachweis / Referenz |
| :--- | :--- | :--- |
| **Authentifizierung & Sessions** | Zero-Trust Backend-for-Frontend (BFF). Kein Token im LocalStorage. AES-256-GCM verschlüsselte, HttpOnly `__Host-session` Cookies. PBKDF2 Hashing (100.000 SHA-512 Runden) für PINs. WebAuthn FIDO2 Passkeys. | `docs/FORENSIC_SECURITY_BASELINE.md` |
| **Mandantentrennung** | Strikte PostgreSQL Row-Level-Security (RLS) mit transaktionslokalem Kontext (`school_id`). Security-Definer RPCs. DML-Trigger neutralisieren Privilege Escalation. | `supabase/migrations/` |
| **Transportverschlüsselung** | TLS 1.3 mit Strict-Transport-Security (HSTS, max-age 63072000, Subdomains, Preload). Subresource Integrity (SRI) für alle Skripte. | `nginx.conf` |
| **Datensicherung & Redundanz** | **Stündliche konsistente PostgreSQL-Dumps** mit GFS-Rotationszyklus (Hourly, Daily, Weekly, Monthly) auf isolierten Volumes. Automatisierte Integritäts- und Wiederherstellungstests. | `scripts/backup_supabase_enterprise.sh` |
| **Löschkonzept** | Zertifiziertes 5-Klassen-Löschkonzept nach **DIN 66398**. Automatisierter Cron-Purge von Audioaufnahmen zum Schuljahresende. Physische Datenvernichtung. | `docs/COMPLIANCE_DOSSIER_DSGVO_DIN66398.md` |
| **Perimeter & WAF** | Nginx Web Application Firewall mit Rate-Limiting, Exploit-Blockern, Bad-Bot-Filter und progressivem Ban via Fail2ban. | `scripts/nginx_enterprise_waf.conf` |
| **Automatisierte CI/CD-Sicherheit** | Automatischer Security Drift Guard und Secret Scanner blockieren unsichere Commits vor dem Deployment. | `scripts/security_drift_guard.mjs` |

---

## 5. Geforderte Deckungsbausteine & Spezifikation für den Antrag

Für den Online-Antrag bei **exali.de** (Produkt: *IT-Haftpflicht*) oder **Hiscox** (Produkt: *Net-IT*) sind folgende Optionen verbindlich auszuwählen:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    VERBINDLICHE ANTRAGS-KONFIGURATION                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Berufsfeld / Branche:           Softwareentwickler / SaaS-Anbieter       │
│ 2. Jahresumsatz (Vorjahr / Plan):  bis 50.000 € (Stufe 1 / Kleinunternehmer)│
│ 3. Deckungssumme Vermögensschaden: 1.000.000 € (2-fach maximiert = 2 Mio. €)│
│ 4. Cyber- & Daten-Eigenschaden:    INKLUSIVE (100.000 € oder 250.000 €)     │
│ 5. Büro- & Betriebshaftpflicht:    INKLUSIVE (2.000.000 € oder 3.000.000 €) │
│ 6. Rückwärtsdeckung:               UNBEGRENZT (rückwirkender Schutz)        │
│ 7. Geltungsbereich:                Weltweit (ohne USA/Kanada) inkl. SCHWEIZ │
│ 8. Selbstbeteiligung:              250 € oder 500 € je Schadenfall          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Begründung für unbegrenzte Rückwärtsdeckung:
Campus-Groovelab ist bereits seit geraumer Zeit in Entwicklung und im Pilot-/Livebetrieb. Dem Betreiber sind zum Zeitpunkt der Antragstellung **keinerlei eingetretene Schäden, Pflichtverletzungen, Abmahnungen oder Schadensersatzansprüche bekannt**. Die unbegrenzte Rückwärtsdeckung stellt sicher, dass Fehler im historischen Codebestand vollen Versicherungsschutz genießen.
