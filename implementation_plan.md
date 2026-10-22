# Implementierungsplan: 100% Kanonische Hausaufgaben-Übereinstimmung über alle Alters-UIs (0,1% Goldstandard)

## Zielsetzung
Herstellung der **100%igen kanonischen Daten- und Anzeige-Parität** sämtlicher Hausaufgaben über **alle didaktischen Altersstufen** (`junior`, `teen`, `pro`) und alle Oberflächen (Schüler-Dashboard, Übe-Pfad / Fokus-Timer, Pre-Flight Modal, Meisterwerk Wochen-Fahrplan) gemäß dem **0,1% Enterprise Goldstandard** ([.agents/AGENTS.md](.agents/AGENTS.md)):

1. **Beseitigung aller Phantom-Seiten bei Lehrwerken**:
   - Keine Anzeige von historischen Übungsseiten (`S. 1, S. 2, S. 3, S. 4, S. 5, S. 6`), wenn nur `S. 2` aktuell als Hausaufgabe deklariert ist.
2. **Kanonische Song-Titel & Namens-Harmonisierung**:
   - Beseitigung von Tippfehlern (`Linken Park` $\rightarrow$ `Linkin Park`) und einheitliche Syntax (`Numb - Linkin Park`).
3. **MicroScore / Notenschnipsel First-Class-Integration**:
   - Vollständige Einbindung und Darstellung von Notenschnipseln (wie `G-Dur Tonleiter (Auf- & Abwärts) · 80 BPM`) im Junior-Übemodus und Junior-Pre-Flight-Modal.
4. **Priorisierung realer didaktischer Lehreranweisungen**:
   - Anzeige der konkreten Hausaufgabennotiz anstelle generischer Standard-Sprüche.
5. **Single Source of Truth (SSOT) Harmonisierung**:
   - Anbindung der Junior-Mission-Engine an den autoritativen Context (`AuthoritativeHomeworkContext` / `AuthoritativeHomeworkPlan`), um Split-Brains strukturell zu verhindern.

---

## Detaillierter 4-Phasen Maßnahmenkatalog

### Phase 1: SSOT Resolver-Harmonisierung & Phantom-Seiten-Fix
**Dateien:**
- [`apps/groovelab/src/components/student/utils/juniorHomeworkResolver.ts`](apps/groovelab/src/components/student/utils/juniorHomeworkResolver.ts)
- [`apps/groovelab/src/components/student/tabs/briefing/homeworkSummaryHelper.ts`](apps/groovelab/src/components/student/tabs/briefing/homeworkSummaryHelper.ts)

**Maßnahmen:**
- In `juniorHomeworkResolver.ts` (Zeile 91ff.) und `homeworkSummaryHelper.ts` (`deriveActiveHomeworkSummary`, Zeile 294ff.):
  - Hinzufügen der zwingenden Prüfung `Boolean(item.is_current_homework)` (bzw. `item.status === 'homework'`), bevor ein `progressItems`-Eintrag mit ` - Seite ` in die aktiven Lehrwerk-Seiten aufgenommen wird.
  - Bereinigung aller Songtitel und Interpreten über `cleanAuthoritativeTitle` (`Linkin Park`).

### Phase 2: MicroScore- & Notiz-Vollständigkeit in Junior-Mission
**Dateien:**
- [`apps/groovelab/src/components/student/utils/juniorMissionDetailsResolver.ts`](apps/groovelab/src/components/student/utils/juniorMissionDetailsResolver.ts)
- [`apps/groovelab/src/components/student/hooks/useStudentJuniorMission.ts`](apps/groovelab/src/components/student/hooks/useStudentJuniorMission.ts)

**Maßnahmen:**
- `resolveJuniorMissionDetails`:
  - Im Rückgabeobjekt bei `type: 'composite'` (Buch + Song) zwingend auch `microScores` mitgeben (`microScores: summary.microScores || []`).
  - Wenn spezifische Notizen zu Lehrwerkseiten oder Songs vorhanden sind, diese als primäre `teacherNote` priorisieren (anstatt des generischen Fallbacks).
- `useStudentJuniorMission`:
  - Optionaler Bezug der kanonischen Hausaufgaben direkt über `useAuthoritativeHomeworkOptional()`.

### Phase 3: Junior Zen HUD & Pre-Flight Modal Upgrade
**Dateien:**
- [`apps/groovelab/src/components/student/tabs/StudentPracticeTab.tsx`](apps/groovelab/src/components/student/tabs/StudentPracticeTab.tsx)
- [`apps/groovelab/src/components/student/modals/StudentJuniorPreFlightModal.tsx`](apps/groovelab/src/components/student/modals/StudentJuniorPreFlightModal.tsx)

**Maßnahmen:**
- In `StudentPracticeTab.tsx` (Zen-HUD, Zeilen 1758–1875):
  - Lehrwerk-Seiten kanonisch formatieren (`formatConsecutivePageRanges(b.pageNums)` z. B. `S. 2`), statt ungeprüfter Einzelbadges.
  - Song-Titel kanonisch über `cleanAuthoritativeTitle` bereinigen.
  - Ergänzung der MicroScore-Zeile: Wenn Notenschnipsel vorhanden sind, Anzeige des Noten-Badges (z. B. `🎼 G-Dur Tonleiter (80 BPM)`) mit 1-Tap-Snippet-Player.
- In `StudentJuniorPreFlightModal.tsx`:
  - Einbindung der MicroScore-Liste in die Übersicht vor dem Raketenstart.

### Phase 4: Forensische Verifikation & Paritäts-Check
- Prüfung der kanonischen Konsistenz bei Wechsel zwischen `junior`, `teen` und `pro`:
  - Lehrwerke: Exakt `Guitar Fitness S. 2` in allen UIs.
  - Songs: Exakt `Linkin Park - Numb` in allen UIs.
  - MicroScores: Exakt `G-Dur Tonleiter` in allen UIs.
  - Didaktische Notizen: Exakt dieselben Anweisungen in allen UIs.

---

## Status der Umsetzung
- [x] **Phase 1: SSOT Resolver-Harmonisierung & Phantom-Seiten-Fix**
- [x] **Phase 2: MicroScore- & Notiz-Vollständigkeit in Junior-Mission**
- [x] **Phase 3: Junior Zen HUD & Pre-Flight Modal Upgrade**
- [x] **Phase 4: Forensische Verifikation & Paritäts-Check**

---

> [!NOTE]
> **Erfolgreich implementiert & forensisch verifiziert**:
> 1. **Phantom-Seiten eliminiert**: Nur noch autoritativ als Hausaufgabe markierte Seiten (`is_current_homework === true` / `status === 'homework'`) gelangen in die Lehrwerksübersichten aller Altersstufen.
> 2. **Kanonische Song-Titel**: Tippfehler bereinigt (`Linken Park` -> `Linkin Park`), konsistente Syntax.
> 3. **MicroScores (Notenschnipsel)**: Vollständig in allen Altersstufen als vollwertige didaktische Einheiten (`microScores`, BPM, Taktlänge, 1-Tap Snippet Player) eingebunden.
> 4. **Didaktische Notizen**: Spezifische Lehreranweisungen zu Aufgaben haben Vorrang vor generischen Platzhaltern.
