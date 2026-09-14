# Campus-Groovelab – Plattformvision & Modulübersicht

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
