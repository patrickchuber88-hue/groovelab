# CAMPUS-GROOVELAB – DAS OFFIZIELLE GESAMT-DOSSIER
> Umfassendes Referenzdokument für Google NotebookLM: Architektur, Module, Preismodell, Pädagogik & Gamification, Audio-Biografie, Campus Studio Module, Sicherheit & Compliance.

---

# TEIL 1: Plattformvision, Zielgruppe & Bounded Contexts

## 1. Executive Summary & Vision
**Campus-Groovelab** ist die moderne, integrierte All-in-One-Plattform für Musikschulen, Musiklehrkräfte, Schülerinnen und Schüler sowie Eltern. Sie vereint Schulorganisation, Raum- und Stundenplanung, didaktische Übewerkzeuge und datenschutzkonforme Kommunikation in einer einzigen hochperformanten Progressive Web App (PWA).

Die Plattform schließt die Lücke zwischen klassischer Schulverwaltung (oft starre Altsysteme) und zeitgemäßem, motivierendem Musikunterricht mit digitalen Übewerkzeugen.

---

## 2. Die drei Bounded Contexts (Farbkodierung)
Campus-Groovelab ist strikt in drei funktionale und visuelle Bounded Contexts unterteilt:

### 🟢 1. Campus-Modul (Schulalltag & Organisation)
* **Farbe**: Grüner Akzent (`#34a853`)
* **Zielgruppe**: Schüler, Eltern, Lehrkräfte, Schulleitung
* **Kernfunktionen**:
  * **Schülerverwaltung & Klassenbuch**: Profilverwaltung, Unterrichtsfächer, Verträge, Notizen.
  * **Stundenplan- & Raumplanung**: Live-Kalender, dynamische Raumbelegung, Belegungskonflikt-Erkennung.
  * **Smart Room Engine**: Intelligente Raumzuteilung basierend auf Raumausstattung (z. B. Flügel, Drumset, PA) und Unterrichtsform.
  * **Event Coordinator & Konzertplaner**: Planung von Schulkonzerten, Vorspielen, Ensembles, Ablaufplänen, Bühnenanforderungen und Equipment-Packlisten.
  * **Didaktischer Messenger**: Datenschutzkonforme Echtzeit-Kommunikation zwischen Lehrern, Schülern und Eltern ohne Herausgabe privater Telefonnummern.
  * **Hausaufgaben & Unterrichtsmaterialien**: Digitale Aufgabenstellung, Bereitstellung von Noten, PDFs, Audiospuren und Feedback.

### 🟡 2. GrooveLab-Modul (Didaktik & Musik-Tools)
* **Farbe**: Gelber Akzent (`#facc15` / `#eab308` mit Slate-900 `#0f172a` Kontrasttext)
* **Zielgruppe**: Schüler & Lehrkräfte (interaktives Lernen und Üben)
* **Kernfunktionen**:
  * **Interaktive Musik- & Übe-Tools**: WebAudio-basiertes Metronom, Stimmgerät, interaktive Begleit-Tracks, Drum-Groove-Player.
  * **Audio-Workstation & Recorder**: Direkte Audioaufnahmen im Browser/Smartphone zur Hausaufgabenabgabe oder Selbstkontrolle.
  * **Musiker-Avatare**: Didaktisches Belohnungssystem mit konfigurierbaren Musiker- und Instrumenten-Avataren (z. B. Geist-Avatar im GrooveLab-Modul).
  * **Audiokontext & WakeLock**: Unterbrechungsfreie Übesessions ohne Display-Abschaltung via `navigator.wakeLock` und nativer iOS-AudioContext-Unlock.

### 🔴 3. Admin & Sekretariat (Verwaltung & Finanzen)
* **Farbe**: Roter Akzent (`#ea4335`)
* **Zielgruppe**: Schulleitung, Sekretariat, Master-Admin
* **Kernfunktionen**:
  * **Lehrer- & Personalverwaltung**: Verwaltung von Festangestellten und Honorarlehrkräften mit DSGVO- und Herrenberg-konformen Nachweisen.
  * **Honorarabrechnung & Stundenkonten**: Automatisierte Abrechnungsvorbereitung, Stundennachweise, Vertretungspläne.
  * **Onboarding-Assistent**: Schneller Massen- oder Einzelimport von Schülern, Ausweisdruck mit QR-Tokens und Eltern-Zugangsbriefen.
  * **Audit-Trail & Notfall-Governance**: Revisionssichere Protokollierung aller administrativen Aktionen in `public.audit_logs`.

---

## 3. Rollen- und Berechtigungsmodell
Die Plattform unterscheidet strikt rollenbasierte Zugänge (RBAC):
* **`master_admin`**: Vollzugriff auf alle Mandanten, globale Einstellungen und Audit-Logs.
* **`admin` / `secretary`**: Schulleitung und Verwaltung einer Musikschule. Neutrales Profilbild (`/campus_login_hero.png`), kein Musiker-Avatar.
* **`teacher`**: Lehrkräfte mit Zugriff auf zugewiesene Schüler, Stundenpläne, Notenvergabe und GrooveLab.
* **`student`**: Schülerinnen und Schüler mit Zugriff auf Unterrichtsmaterialien, GrooveLab-Tools und Chat mit der Lehrkraft.
* **`parent`**: Elternbereich zur Einsicht von Terminen, Rechnungen, Krankmeldungen und didaktischer UI-Level-Steuerung.

---

## 4. Didaktische UI-Levels (Adaptive Oberflächen)
Im Elternbereich kann der didaktische Modus für das Schülerprofil festgelegt werden:
1. **Junior**: Spielerische, vereinfachte Oberfläche mit reduzierten Texten, großen Schaltflächen und Fokus auf spielerische Motivation.
2. **Teen**: Moderne, jugendgerechte Optik mit Fokus auf Eigenverantwortung, schnellen Zugriff auf Jam-Tracks und Medien.
3. **Pro**: Vollständige, professionelle Musiker- und Studenten-Ansicht für fortgeschrittene Instrumentalisten und Musikschul-Ensembles.

*Synchronisation*: Änderungen am UI-Level werden in Echtzeit via Supabase Realtime über alle aktiven Endgeräte (Schüler-Tablet, Smartphone, Web) ohne Neuladen synchronisiert.

---

# TEIL 2: Audio-Biografie, Campus Studio Module, Aufgabenheft & Gamification

## 1. Die persönliche Audio-Biografie (Akustisches Stammbuch & 10 Meilensteine)
* **Konzept**: Ein lückenloses, akustisches Stammbuch über die gesamte Musikschulausbildung hinweg. Eltern und Schüler können jederzeit nachvollziehen, wie das Kind im 1. Schuljahr klang und welche Meilensteine erreicht wurden.
* **10 biografische Meilensteine**: Vom *„Ersten Ton“* über die *„Erste zweistimmige Melodie“* bis hin zu Meilenstein 10: *„Mein großes Meisterstück“*.
* **Junior-Zauberer (6–10 Jahre)**: Kindgerechter *Minimalistischer Zauber-Pfad & Schatztruhe*, der Kinder motiviert, Meilensteine in die Schatzkiste zu legen.
* **Studio-Playlists & 24-Bit Hi-Res Mastering**: Verlustfreie Audioqualität und organisierte Playlists.
* **Export- & Archivgarantie**: Eltern können die gesamte Audio-Biografie jederzeit als ZIP-Archiv aus dem Eltern-Vault herunterladen.

---

## 2. Die 9 Campus Studio Module (Interaktives Musiker-Cockpit)
Im Campus Studio steht ein interaktives Set aus 9 Werkzeugen bereit. Dank des **Jiggle-Modus (iOS-Style)** können Schüler die Modul-Kacheln frei anordnen oder selten genutzte Werkzeuge ausblenden:
1. ⏱️ **Übe-Begleiter (`practice`)**: Digitaler Fokus-Timer, Übe-Countdown, BPM-Anzeige und automatische Zeitprotokollierung.
2. 🎙️ **Aufnahmen (`recordings`)**: Schnelle Mikrofonaufnahmen am Instrument zur Hausaufgabenabgabe oder Selbstkontrolle.
3. 📻 **Groove-Trainer (`groovetrainer`)**: Rhythmus-, Timing- und Metronom-Trainer mit variablen Unterteilungen (Subdivisions).
4. 🎛️ **Stimmgerät (`tuner`)**: Hochpräzises, chromatisches WebAudio-Stimmgerät mit Hertz-Feinjustierung für alle Instrumentengruppen.
5. 🎚️ **Loopstation (`loopstation`)**: Kindersichere Mehrspur-Loopstation zum Einspielen eigener Schichten und Beatboxing.
6. 🎧 **EarLab & Harmony (`earlab`)**: Gehörbildung für Intervalle, Akkorde und Melodien (im Junior-Modus: **Klang-Detektiv**).
7. 🌟 **Skill-Radar / Kompetenz-Radar (`skillradar`)**: Visuelles Spinnendiagramm zur Darstellung musikalischer Fertigkeiten (im Junior-Modus: **Musik-Stern ⭐**).
8. 📖 **Protokoll (`protocol`)**: Chronologischer Verlauf aller Hausaufgaben, Übeeinheiten und Lehrkraft-Notizen.
9. 🏛️ **Archiv (`archive`)**: Frühere Schuljahre, historische Notenbuchseiten und archivierte Meilensteine.

---

## 3. Digitales Aufgabenheft (Hausaufgabenheft)
* **Symmetrischer Aufbau**: Lehrkraft-Vorgaben strikt links, Schüler-Aufnahmen & Rückfragen rechts.
* **30-Sekunden-Dokumentation**: Schnelle Vorlagen und didaktische Textbausteine sparen wertvolle Unterrichtszeit.
* **Audio-Playalongs & Tempodrosselung**:
  * 🐢 **Langsam** (Übetempo), 🚀 **Original** (Konzerttempo), 🥁 **Beat** (Metronom-Puls), 🎸 **Playalong** (Begleitspur).
* **Barrierefreiheit & Sprach-Support**: Text-to-Speech (TTS) Vorlesefunktion für Erstleser und Audio-Diktat für Rückfragen.
* **Digital Detox**: Automatische Nachtruhe von 20:00 bis 07:00 Uhr schützt die Konzentration und die Nachtruhe.

---

## 4. Didaktischer Übe-Pfad & Fokus-System
* **Level-adaptiver Pfad**: Junior (Kosmische Mission *„Meine Übe-Rakete“*), Teen (Streak- und Jam-Fokus), Pro (Statistiken & BPM).
* **Fokus-Timer**: Konzentriertes Üben; `navigator.wakeLock` verhindert das Abschalten des Displays beim Notenlesen.
* **Streaks & Flammen**: Belohnung für Kontinuität inklusive Schutz-Schilden bei Urlaub oder Krankheit.

---

## 5. Das Sticker-System & Errungenschaften
* **Automatische Meilensteine**:
  * *Übezeit*: 🐝 Fleiß-Pionier (20 Min.), 🦉 Übe-Meister (100 Min.), 👑 Übe-Legende (500 Min.), 🏆 Übe-Großmeister (1.500 Min.).
  * *XP-Ränge*: ⭐ XP-Sammler (100 XP), 🎖️ XP-Champion (500 XP), 🌌 XP-Meister (1.500 XP), 💎 XP-Legende (3.500 XP).
  * *Streaks*: 🔥 Dranbleiber (3 Tage), 📆 Wochen-Held (7 Tage), ⚡ Streak-König (21 Tage), 👑 Streak-Kaiser (30 Tage).
  * *Repertoire*: 🎵 Erster Erfolg (1 Song), 📚 Song-Sammler (3 Songs), 🦖 Repertoire-Riese (5 Songs), 🐉 Repertoire-Gigant (10 Songs).
* **15-Jahre-Schuljahr-Wappen**: Ein exklusives Abzeichen für jedes Schuljahr (vom 🎒 *Campus-Pionier* bis zum 🏆 *Kaiser der Meisterschaft* im 15. Jahr).
* **Lehrer-Spezialauszeichnungen**: 🎤 *Bühnen-Star*, 🏆 *Song-Master*, 💡 *Kreativ-Kopf*, 🚀 *Extra-Meile*, 🎧 *Meister-Ohr*.

---

# TEIL 3: Geschäfts-, Preis- & Lizenzmodell

## 1. Grundsatz: Keine Software-Lizenzgebühren
* Software-Bereitstellung: **`0,00 € (Inklusive)`**
* Reines Cloud-Infrastruktur- und Hosting-Modell.

## 2. Kanonische Gebühren-Nomenklatur
1. **Campus-Groovelab Software-Bereitstellung**: `0,00 € (Inklusive)`
2. **Cloud- & Datenbank-Hosting (Basis-Pauschale)**
3. **Team-Service-Gebühr (Lehrkräfte & Verwaltung)**
4. **Schüler-Aktivierungen & Portallizenzen**

## 3. Modul-Preise & Hosting-Flatrates
* **Campus-Modul**: `14,90 € / Monat` (Basis-Hosting pro Musikschule)
* **GrooveLab-Modul**: `9,90 € / Monat` (Basis-Hosting pro Musikschule)
* **Kombi-Vorteil Bundle**: `19,90 € / Monat` (Ersparnis von 4,90 € gegenüber Einzelbuchung)
* **Team-Service-Gebühr**: `0,49 € / Monat` pro aktivem Lehrer-/Verwaltungsprofil.

## 4. Schüleraktivierungen & Abrechnungsmodelle
* Inaktive Schüler in der Datenbank: **`0,00 €` (Kostenlos)**.
* Aktive Schüler: `0,49 € / Monat` pro aktiviertem Modul.
* GrooveLab-Aktivierungen übernimmt immer die Musikschule (Sammelzahler).
* **Option 1: Musikschule übernimmt alles (Sammelzahler)**:
  * Variabel monatlich (Auto-Inaktivierung nach 2 Monaten Inaktivität).
  * Jahresbeitrag (10 % Rabatt) oder Schuljahresstart (20 % Rabatt).
* **Option 2: Direktabrechnung mit Eltern/Schülern (nur Campus-Modul)**:
  * **Ausschließlich als Jahresbeitrag** (einmalig max. `5,39 € / Schuljahr` DE/AT bzw. `CHF 11.00` CH). Keine Kleinst-Monatsabbuchungen.

---

# TEIL 4: Technische Architektur & Sicherheitsstandards

## 1. Technologiestack
* React 18, Strict TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL, Realtime, RPCs), Web Audio API.

## 2. Enterprise+ Security Governance (OWASP ASVS Level 3)
* **Zero-Trust Frontend**: Keine Autorisierung im Client.
* **Autoritative Auth-RPCs**: Logins laufen über `authenticate_by_credential`, `authenticate_webauthn_credential`, `login_master_admin`.
* **Zero-Secret-Leakage**: Keine sensiblen PINs oder Hashes in Views; nur berechnete Flags (`has_parent_pin` etc.).
* **Server-Side PINs**: Verifikation zu 100 % in der Datenbank.
* **Mandantentrennung**: Strikt per `school_id` und RLS Default-Deny.

## 3. Mobile & PWA
* Desktop Layout Immunity (`<= 768px`), Safe Areas, 100dvh, Touch-Targets >= 44×44px, Zero Content Occlusion (`padding-bottom` PWA-Safe).

---

# TEIL 5: Rechtliche Compliance, DSGVO & Barrierefreiheit (BFSG 2025)

## 1. Barrierefreiheit (BFSG 2025 / WCAG 2.2 AA)
* Vollständige Tastaturbedienung aller interaktiven Elemente (`role="button"`, `tabIndex={0}`, `onKeyDown`).
* Kontrast-Parität mind. 4,5:1 (GrooveLab-Gelb mit dunklem Text Slate-900 `#0f172a`).
* WAI-ARIA Dialog- und Tab-Standards; Status: „teilweise vereinbar“ nach BGG/BFSG.

## 2. DSGVO, DIN 66398 & Herrenberg-Compliance
* Hosting in Deutschland / EU, Datensparsamkeit (keine Schüler-Handynummern oder Bankdaten).
* DIN 66398 Löschfristen & revisionssichere Audit-Logs (`public.audit_logs`).
* Herrenberg-Compliance: Trennung von Festangestellten und Honorardozenten zum Schutz vor Scheinselbstständigkeit.
