# Implementierungsplan: Status-Buttons im Aufgabenheft & Fokus-Timer, GrooveLab-Gelb Button & Anti-Cheat Sensorik

## 🎯 Zusammenfassung der Anforderungen & 0,1% Goldstandard Evaluation

| Punkt | Anforderung | Aktueller Zustand | 0,1% Goldstandard Lösung |
|---|---|---|---|
| **1. Aufgabenheft: Wochen-Fahrplan** | Status-Buttons (`Status` / `Klappt` / `Wackelig` / `Hilfe`) wie im Hausaufgaben-Widget integrieren. | In `MeisterwerkDocumentTab.tsx` werden Lehrwerke und Songs ohne Status-Buttons gerendert. | Autarker Satellit `StudentHomeworkStatusButton.tsx` (Netto-Null Zeilenwachstum in `MeisterwerkDocumentTab.tsx`). Vollständige Echtzeit-Synchronisation mit Briefing Board via `save_student_task_reflection` RPC, `localStorage` und Custom-Events. |
| **2. Fokus-Timer HUD** | Notenständer-HUD des Fokus-Timers soll ebenfalls die Status-Buttons erhalten. | In `AuthoritativeHomeworkWidget.tsx` (`variant="hud"`) fehlen die Reflexions-Buttons in den Zeilen. | Integration von `StudentHomeworkStatusButton` in `variant="hud"` mit Dark- & Light-Mode Parität für Teen/Pro- und Junior-Zen-Stage. |
| **3. Hausaufgaben-Widget Frage-Button** | Frage-Button soll unifarben GrooveLab-Gelb (`#facc15`) sein. | Button war pastellgelb (`#fef08a`) mit `#fde047` Rahmen. | Unifarbenes GrooveLab-Gelb (`background: '#facc15'`, `border: '1.5px solid #ca8a04'`) mit tiefem Kontrast-Text (`#0f172a`, WCAG 2.2 AA 8.5:1+) und haptischer Apple-Squircle-Optik. |
| **4. Fokus-Timer Sensorik** | Timer greift nicht auf Sensoren zu; Handy in der Hand bewegen ist möglich; Handy muss flach auf Tisch liegen. | `isPhoneFlat` war in `useStudentPracticeSession.ts` ein toter State ohne Sensor-Listener; `StudentBriefingTab.tsx` setzte `isPhoneFlat(true)` hartcodiert. | Echte `DeviceOrientationEvent`- & `DeviceMotionEvent`-Engine: iOS Safari `requestPermission()` bei Start-Geste; Erkennung von Flachlage (`|beta| < 22`, `|gamma| < 22` bzw. Face-Down `||beta|-180| < 22`); Bewegungserkennung (`magnitude > 2.0 m/s²`). Timer pausiert bei Nicht-Flachlage nach 5s Warnung. Desktop-Safe Fallback. |
| **5. Tab-Wechsel Immunität** | Beim Wechseln des Tabs muss der Timer sofort abgebrochen werden. | `useStudentPracticeSession.ts` gab bei `document.hidden` nur den WakeLock frei, der Timer lief im Hintergrund ungehindert weiter. | `visibilitychange` & `window.blur` brechen aktiven Timer sofort hart ab (`sessionActive = false`, `secondsElapsed = 0`). Keine XP-Vergabe, keine Speicherung. Kindgerechter Warnhinweis: „Fokus abgebrochen: Du hast den Tab gewechselt.“ |
| **6. Server-Integrität & Anti-Cheat** | Server-Prüfung auf 100% korrekte Funktion. | Alte Anti-Cheat-Trigger (Migration 202) griffen nicht mehr (`student_only` Modus veraltet). Frontend schrieb direkt via PostgREST `.insert()` in `fokus_logs`. | Neue Migration `531_enterprise_anti_cheat_focus_session_validation.sql`: Trigger `trg_validate_fokus_log` erzwingt serverseitig `duration_seconds <= 10800` (max 3h), `xp_earned <= FLOOR(duration_seconds / 60)`, keine Zukunfts-Timestamps, keine Überlappungen. Neuer autoritativer RPC `complete_focus_session`. |

---

## 🏛️ Architektur- & Monolith-Ceiling Compliance (0,1% Standard)

1. **Non-Destructive Freeze für `MeisterwerkDocumentTab.tsx` (13.883 Zeilen)**:
   - Es wird KEINE neue Inline-Zustandslogik oder komplexe Handler in die Datei injiziert.
   - Wir erstellen die autarke Komponente `apps/groovelab/src/components/student/homework/StudentHomeworkStatusButton.tsx`.
   - In `MeisterwerkDocumentTab.tsx` werden lediglich die Buttons als kompakte Einzeiler in die Lehrwerk- und Song-Zeilen gemountet (maximal 4 Zeilen Codeänderung, weit unter dem 15-Zeilen-Puffer).
2. **SSOT für Hausaufgaben-Reflexionen**:
   - `save_student_task_reflection` (Migration 511) fungiert als Single Source of Truth in der DB.
   - `campus_student_task_reflections_${studentId}` in `localStorage` sichert Offline-Latenzfreiheit.
   - Window-Event `campus_homework_reflection_updated` garantiert Synchronisation zwischen allen geöffneten Modulen ohne Seiten-Reload.
3. **BFSG 2025 & WCAG 2.2 AA Parität**:
   - Frage-Button: `#facc15` mit Textfarbe `#0f172a` erreicht Kontrastverhältnis von `8.9:1` (weit über geforderten 4.5:1).
   - Alle Status-Buttons verfügen über `role="button"`, `tabIndex={0}`, `onKeyDown` (Enter/Space), `aria-label` und `aria-pressed`.

---

## 📋 Schritt-für-Schritt Implementierungsplan

### Phase 1: Reusable Feature-Monolith `StudentHomeworkStatusButton.tsx`
- **Datei**: `apps/groovelab/src/components/student/homework/StudentHomeworkStatusButton.tsx` (neu)
- Kapselt:
  - Lesen des aktuellen Status aus `taskReflections[taskId]?.status` (übergeben oder aus `localStorage`/Event)
  - Zyklus: `undefined ('Status')` ➔ `'super' ('Klappt')` ➔ `'wackelig' ('Wackelig')` ➔ `'hilfe' ('Hilfe')` ➔ `undefined ('Status')`
  - Persistierung via `localStorage`, Window-Event `campus_homework_reflection_updated` und RPC `save_student_task_reflection`
  - 4 Zustands-Badges (Apple Squircle, monochrome/semantische Icons, saubere Typografie)
  - Varianten: `'standard'` (Hausaufgaben-Widget / Aufgabenheft) und `'compact_hud'` (Fokus-Timer Notenständer)

### Phase 2: Integration in Aufgabenheft (`MeisterwerkDocumentTab.tsx`)
- **Datei**: `apps/groovelab/src/components/student/meisterwerk/MeisterwerkDocumentTab.tsx`
- Lehrwerke-Zeile (Zeile ~11412–11458): Neben dem Seiten-Badge (`S. 1-3`) und dem TTS-Speaker den `<StudentHomeworkStatusButton>` einbinden.
- Songs-Zeile (Zeile ~11742–11760): Neben dem TTS-Speaker den `<StudentHomeworkStatusButton>` einbinden.
- Zeilenzuwachs: ~4 Zeilen (vollständig konform mit Monolith-Ceiling).

### Phase 3: Integration in Fokus-Timer HUD & Unifarbenes GrooveLab-Gelb im Hausaufgaben-Widget
- **Datei**: `apps/groovelab/src/components/student/homework/AuthoritativeHomeworkWidget.tsx`
  - **Punkt 1 (Fokus-Timer HUD)**:
    - In `variant === 'hud'` bei Lehrwerken (`books.map`) und Songs (`safeSongs.map`) den Status-Button integrieren.
    - Dark-Mode und Light-Mode Anpassung für Teen/Pro- und Junior-Zen-Stage.
  - **Punkt 2 (GrooveLab-Gelb unifarben)**:
    - Frage-Button im Hero-Layout (`variant === 'hero'`):
      - `background: '#facc15'` (GrooveLab-Gelb unifarben)
      - `color: '#0f172a'` (Tiefer Kontrast, WCAG 2.2 AA)
      - `border: '1.5px solid #ca8a04'`
      - `boxShadow: '0 4px 14px rgba(250, 204, 21, 0.35)'`
      - Bei `studentQuestion`: Label `Frage aktiv`
      - Bei inaktiver Frage: `Frage?`

### Phase 4: Fokus-Timer Anti-Cheat Engine (Sensoren & Tab-Wechsel)
- **Datei**: `apps/groovelab/src/components/student/hooks/useStudentPracticeSession.ts`
  1. **Sensor-Engine (`DeviceOrientationEvent` & `DeviceMotionEvent`)**:
     - iOS 13+ Safari Permission Flow via `requestPermission()` bei Start-Geste.
     - Neigungsprüfung: Flachlage bei `Math.abs(beta) < 22` und `Math.abs(gamma) < 22` (Face-Up) oder `Math.abs(Math.abs(beta) - 180) < 22` (Face-Down).
     - Bewegungserkennung: `devicemotion` Beschleunigung magnitude > 2.0 m/s² markiert `isMoving = true`.
     - Bei Bewegung oder Neigung: `isPhoneFlat = false`. Nach 5s Grace-Period pausiert der Timer automatisch das Zählen.
     - Desktop-Erkennung: Auf Desktop/Laptop ohne Lagesensoren wird der Sensor-Zwang übersprungen.
  2. **Tab-Wechsel Sofort-Abbruch**:
     - `document.addEventListener('visibilitychange')` & `window.addEventListener('blur')`.
     - Sobald `document.hidden === true` während `sessionActive`:
       - Timer wird SOFORT abgebrochen (`sessionActive = false`, `secondsElapsed = 0`).
       - WakeLock wird sofort freigegeben.
       - Es werden 0 XP und 0 Logs gespeichert.
       - Benutzer erhält klare Benachrichtigung: `Fokus-Session abgebrochen: Du hast die App oder den Tab verlassen.`
- **Datei**: `apps/groovelab/src/components/student/tabs/StudentBriefingTab.tsx`
  - Entfernen des hartcodierten `setIsPhoneFlat(true)` beim Start-Button, sodass die echte Sensor-Engine greift.

### Phase 5: Server-Side Anti-Cheat & 100% Integrität
- **Datei**: `supabase/migrations/531_enterprise_anti_cheat_focus_session_validation.sql` (neu)
  - Universal Database Validation Trigger `trg_validate_fokus_log` auf `public.fokus_logs`:
    - Validiert `duration_seconds > 0` und `<= 10800` (max. 3 Stunden am Stück).
    - Validiert `duration_minutes = FLOOR(duration_seconds / 60)`.
    - Validiert `xp_earned <= FLOOR(duration_seconds / 60)` (verhindert XP-Exploits).
    - Validiert `created_at <= NOW() + INTERVAL '1 minute'` (verhindert Zukunfts-Spoofing).
    - Rate-Limiting gegen Mehrfach-Inserts innerhalb der gleichen Sekunde.
  - Autoritativer RPC `public.complete_focus_session(p_student_id UUID, p_duration_seconds INTEGER, p_metadata JSONB)`:
    - Zero-Trust Server-Berechnung von XP und Minuten.
    - Speichert revisionssicher in `public.fokus_logs`.
    - Löst nahtlos den bestehenden Trigger `handle_fokus_log_changes` (Migration 530) aus.
- **Client-Update in `useStudentPracticeSession.ts`**:
  - `finishPracticeSession` ruft primär den neuen RPC `complete_focus_session` auf (mit sicherem Fallback auf den validierten Insert).

---

## 🔒 Risiken & Schutzmaßnahmen
- **iOS Safari Sensor-Berechtigung**: `DeviceOrientationEvent.requestPermission` wirft einen Fehler, wenn es nicht in einem User-Gesture aufgerufen wird. ➔ Wird direkt synchron im `onClick`-Handler des Start-Buttons aufgerufen.
- **Desktop-Kompatibilität**: Schüler auf Mac/PC haben kein Gyroskop. ➔ Desktop-Erkennung setzt Sensoren auf transparent aktiv, überwacht jedoch Tab-Wechsel (`visibilitychange`) mit 100%iger Härte.
- **Monolith Ceiling Baseline**: `MeisterwerkDocumentTab.tsx` darf nicht um mehr als 15 Zeilen wachsen. ➔ Durch Auslagerung des Status-Buttons in `StudentHomeworkStatusButton.tsx` wächst die Datei um maximal 4 Zeilen.
