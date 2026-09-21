# 🗺️ Campus-Groovelab Roadmap & Feature-Backlog

Dieses Dokument dient als zentrale Entwicklungs-Roadmap für geplante, evaluierte oder zur späteren Reaktivierung zurückgestellte Funktionen der Campus-Groovelab Plattform.

---

## 🎯 Backlog: Schüler-Lehrer Match-Funktion (Blind-Tipp, Live-Showdown & Meilenstein-Pass)

* **Status:** Geparkt auf der Roadmap (Temporär aus der aktiven UI entfernt)
* **Bereich:** Hausaufgabenheft & Meisterwerk-Dokumentation (`MeisterwerkDocumentTab.tsx`)
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

## 🎪 Modul: Event-Planung & Konzert-Koordination (Bühnen, Acts, Packliste & Programmheft)

* **Status:** 🟡 **IN IMPLEMENTIERUNG / AKTIV** (Frontend-Shell & Modals integriert, Server-RPC Migration 454 in Bereitstellung)
* **Bereich:** Campus Termine Board (`CampusEventsBoard.tsx` Spalte 3), Schulleitung & Sekretariat (`SecretaryCampusTab.tsx`), Lehrer-Dashboard
* **Zielgruppe:** Lehrkräfte (Act-Einreichung), Schulleitung & Sekretariat (Koordination, Bühnen-Planung, GEMA, Packlisten)

### 1. Fachliche Motivation & Musikschul-Mehrwert
Musikschul-Konzerte, Klassenvorspiele und Band-Festivals erfordern aufwändige Koordination:
1. **Bühnen- & Zeitplaner:** Verteilung von Ensembles, Solisten und Bands auf bis zu 10 Bühnen mit Zeitfenstern, Pausen und Wunschzeiten.
2. **Packliste & Technikbedarf:** Konsolidierte Summenübersicht aller benötigten Notenständer, Stühle, Mikrofone und Instrumente für Helfer und Hausmeister.
3. **DSGVO- & GEMA-Compliance:** Automatischer Abgleich gegen Schüler-Einwilligungen (`student_consents`) für den Namensabdruck im Programmheft und strukturierte GEMA-Meldedaten (Komponist, Arrangeur, Verlag).

### 2. Technische Schnittstellen & Komponenten
- **Datenbank & Migrationen:**
  - `supabase/migrations/173_event_coordinator_schema.sql` (Tabelle `campus_event_program_points` mit RLS)
  - `supabase/migrations/188_harden_event_coordinator_db.sql` (Trigger & Validierung)
  - `supabase/migrations/454_enterprise_campus_events_covering_indexes_and_bootstrap_rpc.sql` (Covering Indexes & Single-Flight Bootstrap RPC `get_campus_events_bootstrap`)
- **Frontend-Module (`CampusEventsBoard.tsx`):**
  - Lehrer-Einreichung: `setTeacherSubmissionEvent(ev)` (Titel, Besetzung, Wunschzeit, Technikbedarf)
  - Koordinator-Board: `setSecretaryPlanningEvent(ev)` (Bühnen, Drag & Drop Umsortierung, Status `submitted | approved | rejected`, Pausen-Injection)
  - Konsolidierte Equipment- & Packlisten-Übersicht

---

## 🪪 Modul: Physisches Musiker-Pass & Koffer-Badge Set (On-Demand Lettershop, Apple/Google Wallet & D2C-Monetarisierung)

* **Status:** 🟡 **AUF DER ROADMAP (Konzeption & Sicherheitsarchitektur abgeschlossen / Ready for Pilot)**
* **Bereich:** Elternbereich (`ParentCampusActivationModal.tsx` / `StudentSettingsTab.tsx`), Schulsekretariat (`AdminIDGalleryView.tsx`), Backend Print-Cron & SFTP-Dispatch
* **Zielgruppe:** Schülerinnen & Schüler (Campus & GrooveLab), Erziehungsberechtigte, Musikschulleitungen & Fördervereine

### 1. Fachliche & didaktische Motivation
Das Musiker-Pass & Koffer-Badge Set überführt das fehleranfällige Papierschneiden im Schulsekretariat in ein schlüsselfertiges Premium-Fulfillment:
1. **Das Musiker-Set (Dual-Carrier):**
   * **1× CR80 Plastikkarte (0,76 mm Bio-rPVC):** Kreditkartenformat mit Schullogo und Schülernummer.
   * **1× Koffer-Badge (Instrumenten-Schlüsselanhänger):** Wetterfester Mini-Key-Tag für den Reißverschluss des Instrumentenkoffers.
2. **100 % DSGVO-Anonymisierung (Art. 25 Privacy by Design):**
   * Auf dem Ausweis steht ausnahmslos **„Vorname + N.“** (z. B. *„Amelia H.“*) und das Instrument (*„Schlagzeug“*).
   * Der aufgedruckte QR-Code enthält ausschließlich eine pseudonyme 128-Bit UUID (`https://campus-groovelab.de/qr/<token>`). Zero Klardaten auf dem Träger.
3. **Didaktischer Check-in & Alltags-Präsenz:**
   * Der Schlüsselanhänger ist fest mit dem Instrument verbunden. Im Unterricht checkt die Lehrkraft das Kind mit einem 1-Sekunden-Scan direkt am Instrumentenkoffer ein.

### 2. Das B2B2C-Geschäftsmodell & Fördervereins-Kickback
* **Verkaufspreis an Eltern:** **5,50 € brutto**.
* **Herstellungskosten (COGS):** ca. **1,35 €** (Karte, Key-Tag, Anschreiben, Kuvertierung, anteiliger Sammelversand an Schule).
* **1,00 € Fördervereins-Kickback:** Die Musikschule bzw. deren Förderverein erhält **1,00 € pro verkauftem Ausweis** gutgeschrieben. Schulleitung und Lehrkräfte empfehlen den Pass dadurch aktiv am Elternabend.
* **Deckungsbeitrag Plattform:** **~3,15 € Reingewinn pro Schüler (> 60 % Nettomarge)**. Bei 100.000 Schülern und 35 % Conversion erzielt dies rund **110.000 € jährlichen Zusatzgewinn**.

### 3. Die 3-Säulen-Fulfillment-Architektur (Losgröße 1 im laufenden Schuljahr)
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



