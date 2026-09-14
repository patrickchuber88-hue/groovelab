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

## 📜 Backlog: Enterprise Medien-Einwilligungen & Art. 8 / 17 DSGVO Suite (Lehrer-Badges, Programmheft-Guard & Sekretariats-Inbox)

* **Status:** Geparkt auf der Roadmap (Temporär aus der aktiven UI entfernt zur Vermeidung von DSGVO-Fristfallen und Zero-Mail-Bruch)
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

