# 🏛️ IT-Risk, Legal Tech & Insurance Governance Dossier
**Plattform:** Campus-Groovelab (https://campus-groovelab.de)  
**Verantwortlicher Betreiber:** Patrick Huber (Einzelunternehmen)  
**Klassifizierung:** INTERNAL STRATEGY & COMPLIANCE BLUEPRINT  
**Stand:** September 2026  

---

## 1. Executive Summary & Die Ausgangslage des Einzelunternehmers

Campus-Groovelab stellt als Software-as-a-Service (SaaS) Plattform hochentwickelte Werkzeuge für Musikschulen, Lehrkräfte, Eltern und minderjährige Schüler bereit. 

Das primäre juristische und finanzielle Risiko liegt in der **Rechtsform des Einzelunternehmens**:
- Nach **§ 276 BGB i. V. m. § 242 BGB** haftet der Betreiber für Schäden aus vertraglichen Pflichtverletzungen oder deliktischen Handlungen **unbeschränkt persönlich mit seinem gegenwärtigen und zukünftigen Privatvermögen** (Bankkonten, Immobilien, private Wertgegenstände).
- Es gibt keinen Haftungsschild durch ein gesellschaftsrechtliches Haftungskapital (wie die 25.000 € einer GmbH oder die Haftungsbeschränkung einer UG).
- Die Kombination aus **SaaS-Verträgen mit kommunalen Schulträgern**, **Minderjährigen-Datenschutz (Art. 8 DSGVO)** und **hohen Anforderungen an unterbrechungsfreien Unterrichtsbetrieb** macht eine institutionelle IT-Vermögensschaden-Haftpflichtversicherung zur **existenziellen Lebensversicherung für den Betreiber**.

---

## 2. Versicherungstechnisches Risiko-Mapping der Campus-Groovelab Architektur

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│              CAMPUS-GROOVELAB CODEBASE & SYSTEMKOMPONENTEN                       │
│                                                                                  │
│   [Event Coordinator]        [Audio-Loopstation]        [Stundenplan / RLS]      │
│   CampusEventsBoard.tsx      AudioBiographyView.tsx     private_auth Schema      │
│            │                          │                          │               │
└────────────┼──────────────────────────┼──────────────────────────┼───────────────┘
             ▼                          ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│              VERSICHERUNGSTECHNISCHE SCHADENSTATBESTÄNDE                         │
│                                                                                  │
│   • Echter Vermögensschaden  • Urheberrechtsverletzung  • DSGVO-Drittschaden     │
│   • Ausfall Festival/Prüfung • § 201 StGB / Audio-Leak  • Art. 82 Schadensersatz │
│   • Kommunaler Regress       • GEMA/SUISA Abmahnung     • LfDI-Bußgeldverfahren  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### A. Echte Vermögensschäden bei Schulträgern (Verfügbarkeit & SLA)
- **Architektur-Anker:** `apps/groovelab/src/components/CampusEventsBoard.tsx` (Event Coordinator für Konzerte/Festivals), `ScheduleBoard.tsx`, Smart Room Engine.
- **Risiko:** Fällt der Server während einer Großveranstaltung mit hunderten Beteiligten oder zu Schuljahresbeginn bei der Stundenplanerstellung aus, können Schulen Schadensersatz für vergebliche Aufwendungen (z. B. Saalmieten, Technikerhonorare, Ersatzvordrucke) fordern.
- **Erforderliche Deckung:** Vermögensschaden-Haftpflicht (VSH) mit mind. 1.000.000 € Deckungssumme.

### B. Datenschutz-Drittschäden & Minderjährigen-Schutz (Art. 8 & 82 DSGVO)
- **Architektur-Anker:** `users_raw`, Schülerlisten, elterliche Einwilligungen (`parent_allow_audio`), PBKDF2-PINs.
- **Risiko:** Trotz Zero-Trust-Architektur und RLS-Scoping könnte eine Fehlkonfiguration oder eine Zero-Day-Lücke in PostgreSQL zu einem mandantenübergreifenden Datenabfluss führen. Eltern können immateriellen Schadensersatz nach Art. 82 DSGVO geltend machen.
- **Erforderliche Deckung:** Spezifische Klausel zur Deckung von **Drittansprüchen aus Datenschutzverletzungen** sowie Übernahme der Rechtsverteidigungskosten vor Datenschutzaufsichtsbehörden.

### C. Urheberrechts- und Immaterialgüterrechts-Risiken (UrhG / DSA / GEMA)
- **Architektur-Anker:** Song-Bibliotheken, Metadaten-Mediathek, Lehrer-Uploads, `apps/groovelab/src/components/LegalTextModal.tsx`.
- **Risiko:** Zwar ist die Plattform als reine Metadaten-Architektur konzipiert, doch wenn Lehrkräfte Noten-PDFs oder urheberrechtlich geschützte Play-Alongs hochladen, greift bei verspäteter Reaktion auf Notice-and-Takedown-Meldungen die Haftung als Host-Provider (Art. 6 DSA).
- **Erforderliche Deckung:** Mitversicherung von Urheberrechts-, Lizenz- und Markenrechtsverletzungen (inkl. anwaltlicher Abmahnkosten).

### D. Cyber-Eigenschäden & Cloud-Infrastruktur-Zerstörung (First-Party)
- **Architektur-Anker:** Hetzner Cloud Server, Docker-Compose, PostgreSQL-Storage.
- **Risiko:** Ransomware, Zerstörung von Backups oder Denial-of-Service-Angriffe erfordern sofortige Hinzuziehung externer IT-Sicherheitsforensiker und Datenretter.
- **Erforderliche Deckung:** First-Party-Cyberbaustein (100.000 € bis 250.000 €) für Incident-Response, Wiederherstellungskosten und Krisenkommunikation.

---

## 3. Der Klausel-Sicherheitscheck: Die 6 unverzichtbaren AVB-Bedingungen

Beim Abschluss der Police (ob über **exali.de** oder direkt bei **Hiscox**) müssen die Versicherungsbedingungen (AVB) zwingend auf folgende 6 Klauseln geprüft werden:

| # | Klausel / Bedingung | Warum unverzichtbar für Campus-Groovelab? | Status bei exali / Hiscox |
| :- | :--- | :--- | :--- |
| **1** | **Unbegrenzte Rückwärtsdeckung** | Campus-Groovelab wurde bereits in den vergangenen Monaten/Jahren entwickelt. Fehler im bestehenden Codebestand müssen rückwirkend abgesichert sein. | ✅ Standardmäßig enthalten (sofern zum Abschluss keine Schäden bekannt sind). |
| **2** | **Offene Deckung (All-Risk-Prinzip)** | Im Gegensatz zu veralteten Deckungskatalogen ist bei modernen IT-Policen jeder Vermögensschaden versichert, der nicht explizit im Negativkatalog ausgeschlossen ist. | ✅ Enthalten in exali IT-Haftpflicht & Hiscox Net-IT. |
| **3** | **Geographischer Geltungsbereich inkl. Schweiz (CH)** | Die Plattform bedient explizit Nutzer und Schulen in der Schweiz (siehe AGB Teil A & `LegalTextModal.tsx`). Reine EU/EWR-Policen greifen in der Schweiz nicht! | ✅ Weltweiter Schutz (ohne USA/Kanada) schließt die Schweiz voll ein. |
| **4** | **Subunternehmer- & Cloud-Klausel** | Das Hosting erfolgt extern bei Hetzner Online GmbH. Fällt Hetzner aus und wird der Betreiber in Regress genommen, muss die Police greifen. | ✅ Auslagerung an Rechenzentren und Cloud-Provider ist voll mitversichert. |
| **5** | **Passiver Rechtsschutz (Abwehrfunktion)** | Wehrt unberechtigte Schadensersatzforderungen oder Abmahnungen von Schulen/Eltern ab. Der Versicherer trägt alle Anwalts-, Gutachter- und Gerichtskosten bis zum BGH. | ✅ Elementarer Kernbestandteil der Vermögensschaden-Haftpflicht. |
| **6** | **Verzicht auf Einrede der groben Fahrlässigkeit** | Schützt den Betreiber selbst dann, wenn ein Konfigurationsfehler oder ein versehentliches Fehl-Deployment juristisch als grob fahrlässig eingestuft würde. | ✅ In modernen IT-Bedingungen bis zur vollen Versicherungssumme zugesichert. |

---

## 4. Strategische Enthaftungs-Roadmap für die Zukunft

Neben dem sofortigen Abschluss der IT-Haftpflichtversicherung empfiehlt sich folgende mittelfristige Governance-Roadmap:

1. **Phase 1 (Sofort): Abschluss IT-Haftpflicht + Cyber-Eigenschaden**
   - Abschluss über `exali.de` (Stufe 1: bis 50.000 € Umsatz, 1 Mio. € VSH, 250.000 € Cyber, unbegrenzte Rückwärtsdeckung).
   - Jahresbeitrag: ca. 450 € bis 550 € netto.
   - Sofortige Absicherung des Privatvermögens gegen Großschäden.

2. **Phase 2 (Bei Überschreiten von 50.000 € Umsatz oder Erreichen von 10+ Schulen): Umfirmierung in UG oder GmbH**
   - Gründung einer **Campus-Groovelab UG (haftungsbeschränkt)** oder **GmbH**.
   - Einbringung der Plattformrechte und Übertragung der B2B-Verträge auf die juristische Person.
   - **Wirkung:** Formaler Ausschluss der persönlichen Haftung für operative Schulden (§ 13 Abs. 2 GmbHG).

3. **Phase 3 (Nach Umfirmierung): D&O-Versicherung (Organhaftpflicht)**
   - Schützt den Geschäftsführer vor Inanspruchnahme durch die Gesellschaft bei operativen Fehlentscheidungen (Innenverhältnis).
   - Kann im bestehenden exali/Hiscox-Vertrag mit einem Mausklick als Zusatzbaustein aktiviert werden.
