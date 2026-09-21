# 🗺️ Campus-Groovelab Roadmap & Feature-Backlog

Dieses Dokument dient als zentrale Entwicklungs-Roadmap für geplante, evaluierte oder zur späteren Reaktivierung zurückgestellte Funktionen der Campus-Groovelab Plattform.

---

## 🏆 Priorität 1: Modulare Dashboard-Konsolidierung & Shared Suite Core (Admin / Sekretariat / Master-Admin)

* **Status:** 🚀 **PRIORITÄT 1 (In Vorbereitung / Nächster Kern-Meilenstein)**
* **Bereich:** Globale Verwaltungs-Architektur (`AdminDashboard.tsx`, `SecretaryDashboard.tsx`, `MasterAdminDashboard.tsx`)
* **Zielgruppe:** Schulleitung, Schulsekretariat, Master-Administratoren & Entwicklerteam

### 1. Ausgangsbefund & Architektur-Motivation (Forensische Over-Engineering-Analyse)
Im Ist-Bestand der Plattform existieren historisch gewachsen drei parallele Administrations-Dashboards:
1. `SecretaryDashboard.tsx` (modulare Monolith-Suite mit ~2.950 LOC, hochveredelt mit B2B-Governance, Ausfall-Cockpit, Stundenplänen und Live-Lab Blueprint).
2. `AdminDashboard.tsx` (älteres Schul-Admin-Dashboard mit teils redundanten Personal-, Lizenz- und Einstellungsansichten).
3. `MasterAdminDashboard.tsx` (mandantenübergreifendes Betreiber-Dashboard für Plattform-Statistiken, System-Health und globale Mandantensteuerung).

Obwohl alle drei Dashboards auf identische fachliche Domänen (Schulen, Personal, Schüler, Lizenzen, Audit-Logs, Stundenpläne) zugreifen, existieren duplizierte State-Logiken, parallele RPC-Hooks und redundante UI-Container. Dies widerspricht dem **DRY-Axiom** und dem **Monolith Goldstandard**.

### 2. Zielarchitektur: The "Shared Suite Core"
Zusammenführung aller administrativen Aufgabenbereiche in eine modulare, wiederverwendbare Komponenten- und Hook-Architektur:
```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      SHARED ADMINISTRATIVE SUITE CORE                           │
│                     packages/shared-admin-ui (oder src/components/admin-core)   │
├───────────────────┬───────────────────┬───────────────────┬─────────────────────┤
│ 👥 Personal-Suite │ 🎓 Schüler-Suite  │ 💳 Billing & SLA  │ 📜 Audit & Betroff. │
│ (Mitarbeiter/Team)│ (Klassen/Import)  │ (Tarife/Hosting)  │ (Art. 17/30 DSGVO)  │
├───────────────────┴───────────────────┴───────────────────┴─────────────────────┤
│ 🛡️ Bounded Context Role Gates (Schulleitung vs. Sekretariat vs. Master-Admin)   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

1. **Gemeinsame Sub-Views (Single Source of Truth):**
   - Extraktion von `StaffManagementView`, `StudentDirectoryView`, `LicenseGovernanceView`, `FacilityLogView` und `AuditTrailView` in autarke, rein zustandsgesteuerte Kern-Komponenten.
2. **Deklarative Rollen-Gates & Berechtigungs-Filter:**
   - Einbindung über strikte Berechtigungs-Props (`canManageBilling={role === 'admin'}`, `canAccessPlatformMaster={user.is_master_admin}`).
   - Beseitigung redundanter Duplikate bei gleichzeitiger Wahrung hermetischer Mandantentrennung.
3. **Drastische Reduktion von Bundle-Größe & Wartungsaufwand:**
   - Einsparung von über 4.000 redundanten Codezeilen über alle Dashboards hinweg.
   - 0ms Reaktivität und konsistente User-Experience für Schulleitungen und Sekretariate.

---

## 🎯 Backlog: Schüler-Lehrer Match-Funktion (Blind-Tipp, Live-Showdown & Meilenstein-Pass)

* **Status:** ✅ **VOLLSTÄNDIG REAKTIVIERT & LIVE (Track 3 / Goldstandard Didaktik & Gamification)**
* **Bereich:** Hausaufgabenheft & Meisterwerk-Dokumentation (`MeisterwerkDocumentTab.tsx`, `MeisterwerkDocumentationModal.tsx`)
* **Zielgruppe:** Schüler (Campus & GrooveLab) und Lehrkräfte

### 1. Pädagogische Motivation & Spielmechanik
Die **Match-Funktion** ist ein metakognitives Feedback- und Gamification-Werkzeug, das die Selbstreflexion und das Gehör der Schüler für die eigene Leistung spielerisch schult:

1. **Selbstreflexion beim Üben (Blind-Tipp):**
   - Beim Üben zu Hause schätzt der Schüler seinen eigenen Song-Fortschritt auf einer Skala von 0 bis 100 % mit einem altersgerechten Slider ein (mit Emoticons von *🐌 Aller Anfang* bis *🚀 Bühnenreif!*).
   - **Zero-Bias Schutz:** Die aktuelle Lehrkraft-Einschätzung bleibt für den Schüler vollständig verdeckt (*🔒 Lehrer-Wertung verdeckt*).
   - Vor der Unterrichtsstunde schickt der Schüler seinen Tipp verbindlich ab (*🔒 Tipp für Match abschicken*).
2. **Der Live-Match Moment im Unterricht:**
   - In der Unterrichtsstunde bewertet die Lehrkraft den Song unabhängig.
   - Per Klick auf **„🎯 Match prüfen“** startet der gemeinsame **Live-Match Showdown**.
3. **1,2s Dual-Balken Showdown-Race:**
   - Eine animierte Rennbalken-Darstellung visualisiert Lehrkraft- und Schüler-Schätzung synchron.
   - Bei Treffern ertönt ein Soundeffekt und es wird Konfetti ausgelöst.

### 2. Belohnungs-Stufen & XP-Matrix
| Stufe | Treffergenauigkeit | Belohnung | Abzeichen |
| :--- | :--- | :--- | :--- |
| **Volltreffer** | Differenz $\le 10\%$ | **+50 XP** | 🎯 Holographischer *Meister-Ohr Sticker* |
| **Super Gehör** | Differenz $\le 20\%$ | **+25 XP** | ✨ *Super Gehör* Abzeichen |
| **Weiter-Rocker**| Differenz $> 20\%$ | **+5 XP** | 🚀 *Weiter-Rocker Mut-Bonus* |

### 3. Meilenstein-Pass (3-Match Zyklus)
- Ein Song durchläuft bis zur vollständigen Meisterung 3 Meilenstein-Zyklen (z. B. Match 1: Rhythmus/Grundakkorde, Match 2: Übergänge/Solo, Match 3: Bühnenreife).
- Im Meilenstein-Pass sammelt der Schüler die drei holographischen Sticker mit Datumsstempel und Differenz-Wertung.

### 4. Grund für das Parken auf der Roadmap
Im aktuellen Entwicklungsschritt steht die **reibungslose, intuitive Basisfunktionalität** im Vordergrund:
- Schnelle Hausaufgabenvergabe und Mediathek-Synchronisation ohne visuelle Überfrachtung.
- Direkte Konzentration der Schüler auf Aufgaben, Übe-Timer und Audio-Takes.
- Die Match-Funktion wird zu einem späteren Release-Zeitpunkt als zuschaltbares Add-on / Gamification-Modul wieder bereitgestellt.

### 5. Technische Schnittstellen & Wiederaufnahme-Inventar
Das Datenmodell und die Komponenten bleiben im Codebase-Fundament erhalten und können jederzeit nahtlos wieder eingehängt werden:
- **Datenbank & RPCs:** Spalten in `user_song_skills`:
  - `student_rating` (INTEGER 0–100)
  - `student_rating_updated_at` (TIMESTAMPTZ)
  - `is_match_mode_enabled` (BOOLEAN)
  - `last_matched_at` (TIMESTAMPTZ)
  - `last_matched_teacher_percent` (INTEGER)
  - `last_matched_student_percent` (INTEGER)
  - `is_match_successful` (BOOLEAN)
- **Komponenten:**
  - `apps/groovelab/src/components/MeisterOhrSticker.tsx` (Holographischer Sticker mit Schimmer-Animation)
  - `apps/groovelab/src/components/student/modals/StudentMatchCelebrationModal.tsx` (Vollbild-Feier-Modal)
- **Reaktivierung:**
  - In `MeisterwerkDocumentationModal.tsx`: `isMatchModeEnabled` auf `true` setzen bzw. Lehrkraft-Schalter freischalten.
  - In `MeisterwerkDocumentTab.tsx`: Die Match-Container in der Song-Detailansicht wieder einblenden.

---

## 📜 Backlog: Enterprise Medien-Einwilligungen & Art. 8 / 17 DSGVO Suite (Lehrer-Badges, Programmheft-Guard & Sekretariats-Inbox)

* **Status:** ✅ **VOLLSTÄNDIG REAKTIVIERT & LIVE (Track 2 / Commit 89bd0d09 / SEC-22)**
* **Bereich:** Elternbereich (`ParentConsentSettingsView.tsx`), Lehrkraft-Ansichten (`TeacherStudentsView.tsx`), Event-Planung (`CampusEventsBoard.tsx`), Schulsekretariat (`SecretaryAuditView.tsx` / DSGVO-Inbox)
* **Zielgruppe:** Erziehungsberechtigte, Musiklehrkräfte, Schulleitung & Sekretariat

### 1. Fachliche Motivation & Musikschul-Mehrwert
Jede Musikschule benötigt rechtsverbindliche Freigaben für Schülerfotos, Konzertprogramme und Website-Berichte. Bislang erfolgt dies meist über papierbasierte Zettelwirtschaft, die im Schulalltag schnell verlegt wird.
Ein vollintegriertes, digitales Einwilligungs- und Medienmanagement bietet Musikschulen enormen Mehrwert:
1. **Transparenz für Eltern (Art. 7 & 8 DSGVO):** Eltern bestimmen behutsam, welche Medienfreigaben für ihr Kind gelten.
2. **Rechtssicherheit für Lehrkräfte:** Keine Angst mehr vor Abmahnungen beim Fotografieren von Vorspielen oder Ensembles.
3. **Automatisierte Konzertprogramm-Prüfung:** Das System warnt automatisch, wenn für einen Schüler kein Einverständnis für den Namensabdruck im Programmheft vorliegt.

### 2. Grund für das Parken auf der Roadmap
Im Ist-Zustand war lediglich die „Vorderseite“ im Elternbereich implementiert, während die empfangenden Schnittstellen noch fehlten:
- **Fehlende Schnittstelle zu Lehrkräften & Events:** Widerrufe von Eltern wurden in der Datenbank gespeichert, aber weder in der Schülerliste der Lehrkraft noch beim Konzertprogramm-Export angezeigt. Dies erzeugte eine gefährliche Scheinsicherheit.
- **Zero-Mail-Konflikt:** Das Toggle *„Musikschul-Briefe per E-Mail“* widersprach der Zero-Mail-Plattform-Doktrin für Schüler und Familien.
- **Juristische Fristfalle bei Art. 17 Löschanträgen:** Der Button zur Datenlöschung meldete eine fristgerechte Bearbeitung durch das Sekretariat, obwohl in der Schulverwaltung noch kein Posteingang für DSGVO-Löschanträge existierte. Nach Art. 12 Abs. 3 DSGVO gilt eine gesetzliche 30-Tage-Frist, die im Ist-Zustand unbemerkt verstrichen wäre.

### 3. Spezifikation der 4 Roadmap-Bausteine zur Reaktivierung

```
                  ┌───────────────────────────────────────────────┐
                  │          ELTERNBEREICH (PWA)                  │
                  │  Granulare Toggles (Foto, Programmheft etc.)  │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          ▼
         ┌────────────────────────────────┴────────────────────────────────┐
         │                                                                 │
         ▼                                                                 ▼
┌─────────────────────────────────┐                       ┌─────────────────────────────────┐
│     LEHRER-ANSICHT              │                       │    SEKRETARIAT & ADMIN          │
│ • Rotes Badge "📷 Foto-Sperre"  │                       │ • DSGVO-Inbox (Art. 17 Anträge) │
│ • Warnung bei Ensemble-Fotos    │                       │ • Programmheft-Export-Filter    │
│ • Warnung im Konzert-Planer     │                       │ • Statusbericht für Schulleitung│
└─────────────────────────────────┘                       └─────────────────────────────────┘
```

1. **Zero-Mail Bereinigung (Wording & Kanal):**
   - Das Item *„Musikschul-Briefe & Eltern-Info“* wird zero-mail-konform definiert:  
     *„Musikschul-Infos & Eltern-News (per Campus-Push und Pinnwand)“* statt *„per E-Mail“*.
2. **Lehrkraft-Schutz-Badges (`TeacherStudentsView.tsx`):**
   - In der Schülerkarte der Lehrkraft wird bei entzogener Foto-Einwilligung ein gut sichtbares Badge gerendert:  
     `📷 Foto-Sperre (Keine Aufnahmen)` bzw. `📜 Kein Namensabdruck im Programmheft`.
3. **Konzert- & Vorspiel-Guard (`CampusEventsBoard.tsx`):**
   - Beim Erstellen oder Exportieren von Schülervorspielen prüft die Plattform die Liste der teilnehmenden Schüler gegen `student_consents` (`consent_type = 'concert_program'`).
   - Bei fehlender Einwilligung wird die Lehrkraft gewarnt oder der Name wird automatisch anonymisiert (*„Schüler:in, Violine“*).
4. **DSGVO-Inbox im Schulsekretariat (`SecretaryDashboard.tsx`):**
   - Eigener Menüpunkt oder Tab *„DSGVO & Betroffenenrechte“*.
   - Übersicht aller offenen Art. 17 Löschanträge aus `public.gdpr_deletion_requests` mit Frist-Countdown (*„Frist läuft ab in X Tagen“* nach Art. 12 Abs. 3 DSGVO) und 1-Klick-Abarbeitung.

### 4. Technische Schnittstellen & Wiederaufnahme-Inventar
Das Datenmodell und die Eltern-Komponente bleiben im Fundament vollständig erhalten:
- **Datenbank & Migration:** `supabase/migrations/419_parent_consent_and_gdpr_governance.sql`:
  - Tabelle `public.student_consents` mit RLS und Constraint `(student_id, consent_type)`
  - Tabelle `public.gdpr_deletion_requests` mit Status `pending/completed/rejected`
  - RPC `public.save_student_consent(UUID, TEXT, BOOLEAN)` mit unveränderbarem Audit-Log in `public.audit_logs`
- **Frontend-Komponente:**
  - `apps/groovelab/src/components/student/settings/ParentConsentSettingsView.tsx`
- **Reaktivierungs-Schritte:**
  1. Wording in `ParentConsentSettingsView.tsx` auf Campus-Push (Zero-Mail) anpassen.
  2. Badges in `TeacherStudentsView.tsx` und Filter in `CampusEventsBoard.tsx` einhängen.
  3. Sekretariats-Inbox für `gdpr_deletion_requests` fertigstellen.
  4. In `StudentSettingsTab.tsx`: Kachel `consents` im Einstellungs-Array wieder aktivieren.

---

## 🪪 Modul: Physisches Musiker-Pass & Koffer-Badge Set (On-Demand Lettershop, Apple/Google Wallet & D2C-Monetarisierung)

* **Status:** 🟡 **AUF DER ROADMAP (Konzeption & Sicherheitsarchitektur abgeschlossen / Ready for Pilot)**
* **Bereich:** Elternbereich (`ParentCampusActivationModal.tsx` / `StudentSettingsTab.tsx`), Schulsekretariat (`AdminIDGalleryView.tsx`), Backend Print-Cron & SFTP-Dispatch
* **Zielgruppe:** Schülerinnen & Schüler (Campus & GrooveLab), Erziehungsberechtigte, Musikschulleitungen & Fördervereine

### 1. Fachliche & didaktische Motivation
Klassische Musikschulausweise werden bislang im Schulsekretariat auf normalem DIN-A4-Papier gedruckt, händisch mit der Schere zugeschnitten und ggf. provisorisch laminiert. Das führt zu verknickten Zetteln, unleserlichen QR-Codes und erheblichem Zeitaufwand im Sekretariat.
Das physische Musiker-Pass & Koffer-Badge Set ersetzt diesen Prozess durch einen schlüsselfertigen Premium-Standard:
1. **Das Musiker-Set (Dual-Carrier):**
   * **1× CR80 Plastikkarte (0,76 mm Bio-rPVC):** Robust wie eine Bankkarte, seidenmatt, abgerundete Ecken, mit Schullogo und Schülernummer.
   * **1× Koffer-Badge (Instrumenten-Schlüsselanhänger):** Wetterfester Mini-Key-Tag mit Metallring für den Reißverschluss des Gitarren-Gigbags oder Geigenkoffers.
2. **100 % DSGVO-Anonymisierung (Art. 25 Privacy by Design):**
   * Auf dem Ausweis steht ausnahmslos **„Vorname + N.“** (z. B. *„Amelia H.“*) und das Instrument (*„Schlagzeug“*).
   * Der aufgedruckte QR-Code enthält ausschließlich eine pseudonyme 128-Bit UUID (`https://campus-groovelab.de/qr/<token>`). Zero Klardaten auf dem Trägermedium.
3. **Didaktischer Check-in & Alltags-Präsenz:**
   * Der Schlüsselanhänger ist fest mit dem Instrument verbunden; das Kind vergisst den Ausweis nie. Im Unterricht checkt die Lehrkraft oder das Schüler-Terminal das Kind mit einem 1-Sekunden-Scan direkt am Instrumentenkoffer ein.

### 2. Das B2B2C-Geschäftsmodell & Fördervereins-Kickback
Das Ausweis-Set wird im Elternbereich als optionales Premium-Upgrade für **5,50 € (brutto)** angeboten:
* **Herstellungskosten (COGS):** ca. **1,35 €** (Karte, Key-Tag, Anschreiben, Kuvertierung, anteiliger Sammelversand).
* **1,00 € Fördervereins-Kickback:** Die Musikschule bzw. deren Förderverein erhält **1,00 € pro verkauftem Ausweis** gutgeschrieben (z. B. für neue Instrumente oder Noten). Schulleitungen und Lehrkräfte empfehlen den Pass dadurch aktiv am Elternabend.
* **Deckungsbeitrag Plattform:** **~3,15 € Reingewinn pro Schüler (> 60 % Nettomarge)**. Bei 100.000 Schülern und 35 % Conversion erzielt dies rund **110.000 € jährlichen Zusatzgewinn**.

### 3. Die 3-Säulen-Fulfillment-Architektur (Losgröße 1 im laufenden Schuljahr)
```
                  ┌────────────────────────────────────────────────────────┐
                  │          ELTERN BESTELLEN IM CAMPUS-ELTERN-PORTAL      │
                  └──────────────────────────┬─────────────────────────────┘
                                             │
                 ┌───────────────────────────┴───────────────────────────┐
                 ▼                                                       ▼
    ┌─────────────────────────┐                             ┌─────────────────────────┐
    │  SOFORTIGE VERFÜGBARKEIT│                             │  PHYSISCHE PRODUKTION   │
    │  (0 Sekunden Wartezeit) │                             │  (Wöchentlicher Takt)   │
    ├─────────────────────────┤                             ├─────────────────────────┤
    │ • Apple Wallet Pass     │                             │ • Sunday-Midnight Batch │
    │ • Google Wallet Pass    │                             │ • Sammel-PDF / CSV      │
    │ • Digital-Pass in PWA   │                             │ • Full-Service-Letter-  │
    │ • Sofort einsatzbereit  │                             │   shop (All About Cards)│
    └─────────────────────────┘                             └─────────────────────────┘
```
1. **Säule 1 (Zero-Day Gratification):** Apple Wallet Pass (`.pkpass`) und Google Wallet Pass stehen unmittelbar nach dem Kauf in der App bereit.
2. **Säule 2 (Sunday-Midnight Batch):** Ein wöchentlicher Backend-Cronjob fasst alle Einzelbestellungen zusammen. Keine Mindestmengenprobleme, planbare Lieferzeiten von 4–7 Werktagen.
3. **Säule 3 (Sammelversand an Schule):** Lieferungen erfolgen gebündelt als DHL-Paket an das Schulsekretariat; die Lehrkraft übergibt das Set feierlich im Unterricht.

### 4. Cyber-Security & Anti-Insider Schutzarchitektur (OWASP ASVS Level 3)
* **Status `printed_in_transit`:** Während des Drucks und Versands sperrt die Datenbank den QR-Code gegen Erstaktivierungen.
* **Erst-Setup nur Out-of-Band:** Die Vergabe der persönlichen Eltern-PIN ist an den verifizierten Schul-Einladungslink gebunden oder wird erst im Unterricht durch den Scan einer autorisierten Lehrkraft („Lehrer-Handshake“) entsperrt.
* **Brute-Force-Sperre:** Server-seitiges IP-Hash Rate-Limiting (`qr_login_rate_limits`) verhindert das Erraten von PINs bei abfotografierten Karten zuverlässig.

### 5. Konkrete Implementierungs-Schritte zum Rollout
1. **Bestell-Widget im Elternportal:** Integration einer 1-Klick-Bestelloption in `StudentSettingsTab.tsx` / `ParentCampusActivationModal.tsx` mit Apple Pay / SEPA.
2. **Backend-Job `export_weekly_print_batch`:** Supabase Edge Function zur Aggregation druckfertiger 300-DPI-Vektor-PDFs und Adress-CSVs.
3. **Lettershop-Anbindung:** Anbindung an *All About Cards* (Passau) oder *karte1.de* (München) via SFTP-Hotfolder mit AVV nach Art. 28 DSGVO.
4. **Pilot-Testlauf:** Bemusterung von 100 Sets an zwei Pilotschulen zur Prüfung von Scangeschwindigkeit und Koffer-Befestigung.

---

## 📈 Strategisches Partnerschaftsmodell & DACH-Marktpotenzial (Pädagogischer Fachbeirat)

* **Status:** 🟢 **KONZEPTION & TERM-SHEET ABGESCHLOSSEN (Pilotierung: Musikschule Bad Säckingen)**
* **Bereich:** Unternehmensstrategie, B2B-Vertrieb & Pädagogischer Fachbeirat
* **Artefakt / Unterlage:** `docs/partnerschaft_factsheet_bad_saeckingen.html`

### 1. Offizielle Marktdaten DACH-Raum (Verbandsdaten VdM, KOMU, VMS)
| Land / Verband | Musikschulen (Institutionen) | Schülerinnen & Schüler | Fachlehrkräfte |
| :--- | :---: | :---: | :---: |
| **Deutschland (VdM & Freie)** | ca. **1.400** *(930 VdM)* | **1.550.000** | ca. **45.000** *(36.000 VdM)* |
| **Österreich (KOMU)** | ca. **380** | **220.000** | ca. **7.200** |
| **Schweiz (VMS)** | ca. **365** | **180.000** | ca. **14.000** |
| **GESAMT DACH-RAUM** | **> 2.100 Schulen** | **> 1,95 Mio. Schüler** | **ca. 66.000 Lehrkräfte** |

### 2. Kern-Eckpunkte des Partnermodells (1% Goldstandard)
1. **Referenzschule Bad Säckingen:** 100 % kostenfreie Dauernutzung als Reallabor und Vorzeigeschule.
2. **Sofortige Umsatzbeteiligung (Ab Tag 1):** 20 % an den monatlichen Gesamteinnahmen aller Schulen der Plattform (bei Ø 200 € / Schule = 40 € pro Schule).
3. **Erfolgsleiter durch Eigenakquise:** Steigerung des Gesamtsatzes bei aktiver Schulaquise:
   * 10 Schulen: **25 %** | 25 Schulen: **30 %** | 50 Schulen: **40 %** | 100 Schulen: **49 %** (bis zu ~10.000 € / Monat).
4. **Das 90-Minuten Jour-Fixe Prinzip:** Monatliches Strategietreffen als feste Voraussetzung. Keine Stundenzettel. Ausfall ohne Entschuldigung = ersatzloser Wegfall der Monatsauszahlung.
5. **Schutz des Geistigen Eigentums (IP):** Quellcode, Datenbanken, Systemrechte und Marken verbleiben dauerhaft zu 100 % bei Patrick Huber. Option auf gemeinsame Betriebsgesellschaft (UG/GmbH) ab 25 Schulen.



