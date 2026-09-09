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
