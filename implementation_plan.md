# 🍎 Apple HIG 0,1% Goldstandard Evaluation: Stundenplan-Designer Studio-Bar

## 🎯 1. Schonungslose Apple HIG Evaluation des aktuellen Zustands

> **Frage des Entwicklers:** *„Entspricht das dem absoluten 0,1% Design Goldstandard von Apple? Apple HIG Goldstandard? Prüfe was dieser Stundenplan-Designer im Live-Betrieb wirklich braucht.“*
> 
> **Klare, unmissverständliche Antwort:** **NEIN.**
> Der aktuelle Stand (siehe Screenshot `media_1791562359448_36abe728.png`) verletzt fundamentale Kernprinzipien der **Apple Human Interface Guidelines (HIG)** sowie die OWASP/Monolith-Goldstandard-Axiome.

---

### 🚨 Die 5 gravierenden HIG- & Design-Verstöße im aktuellen Screenshot

```
[ AKTUELLES PROBLEM-BILD IM SCREENSHOT ]
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ENTWÜRFE: [Entwurf 1 • 25] [Entwurf 2 25] [Entwurf 1 (K...] [Neue]  [Raster: 15] [★ Wunsch • Ausweich]   │
│                                                              [ r  ]                                         │
│                                                              [Entw] [Namen] [Zeiten] [Mehr]  [Auto-Zuteilen]│
│                                                              [urf ]                                         │
│                                                              [+  ▾]                          [↶][🔄][🗑️]     │
├─────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 🕒 Arbeits-Entwurf: „Entwurf 1 (Kopie)“ (Gefahrlose Sandbox)               [ Auswertung ]  [ Freigabe 🚀 ]  │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Grotesker CSS-Kollaps (`Neue \n r \n Entw \n urf`):**
   - Der Button `+ Neuer Entwurf` wird mangels `whiteSpace: 'nowrap'` und wegen unkontrolliertem Flex-Shrink (`flexShrink: 1` am Elterncontainer) horizontal auf ~35 Pixel zusammengequetscht. Der Text bricht buchstabenweise in eine groteske vertikale Säule um.
2. **Kognitive Reizüberflutung (Tool-Inflation & Cockpit-Effekt):**
   - In einer einzigen Leiste drängen sich **12 konkurrierende Bedienelemente**. 4 davon sind im Screenshot permanent ausgegraut/disabled (`Automatisch zuteilen`, `Rückgängig`, `Zurücksetzen`, `Tage leeren`).
   - Apple HIG Grundsatz: *„Deference & Clarity — Die Werkzeugleiste dient dem Inhalt und drängt sich niemals in den Vordergrund.“*
3. **Destruktive Aktionen im primären Sichtfeld:**
   - `[ Zurücksetzen ]` und `[ 🗑️ Tage leeren ]` stehen permanent neben `Rückgängig` in der Hauptleiste. Destruktive Aktionen gehören im Apple HIG **niemals** ungeschützt in die primäre Werkzeugleiste, sondern zwingend in ein Aktionsmenü (`⋯`).
4. **Statische Farblegende als 170px-Buttonklotz in der Werkzeugleiste:**
   - Der Block `• ★ Wunsch • ○ Ausweich` ist kein Werkzeug, sondern eine passive Legende. Eine passive Legende hat in einer Apple-Werkzeugleiste (macOS Toolbar / iPadOS Navigation Bar) absolut nichts verloren. Sie stiehlt Platz für echte Werkzeuge.
5. **Vertikales 2-Zeilen-Wrapping im Center-Bereich:**
   - Der Center-Bereich bricht intern um: `Raster` und `Wunsch` liegen oben, `Namen schützen`, `Zeiten ändern`, `Mehr` liegen darunter. Dadurch schwankt die Höhe der Toolbar unruhig zwischen 36px und 68px.
6. **Redundanz zwischen Studio-Bar und Hero-Banner:**
   - Der darunterliegende `ScheduleLifecycleHero`-Banner bietet bereits die kontextuelle Führung und primäre CTAs (*„zur Freigabe einreichen“* oder *„Automatisch berechnen“*). Die Toolbar oben dupliziert denselben Button noch einmal in disabled.

---

## 🧭 2. Reale Bedarfs-Analyse: Was braucht dieser Designer im Live-Betrieb WIRKLICH?

Lass uns den echten Arbeitsalltag einer Musikschul-Lehrkraft und der Schulleitung betrachten:

### Die 2 Betriebsmodi:

| Betriebsmodus | Häufigkeit | Was macht der Nutzer? | Was muss die UI bieten? |
| :--- | :--- | :--- | :--- |
| **A. Normalbetrieb (Genehmigter Plan)** | **95 % des Schuljahres** | Die Lehrkraft schaut in den Kalender, prüft wer heute Unterricht hat oder dokumentiert Notizen. Der Stundenplan ist **fertig und aktiv**. | • Maximale Ruhe und Übersicht.<br>• Voller Fokus auf das Kalender-Grid.<br>• 0 Ablenkung durch Editiertasten, Reset-Knöpfe oder Entwurfswähler.<br>• Grüner Status-Banner: *„Genehmigter Stundenplan aktiv“*. |
| **B. Planungsphase (Neues Semester)** | **5 % des Schuljahres** | Die Lehrkraft legt Tage fest, teilt Schüler ein (per Auto-Solver oder Drag & Drop), probiert ggf. 1–2 Alternativen aus und reicht ein. | • **1. Szenario-Wahl:** Umschalten zwischen Entwurf A und B.<br>• **2. Canvas-Settings:** 15-Minuten-Raster einstellen, Datenschutz (Namen schützen).<br>• **3. Zuteilung:** 1 Klick auf *„Automatisch zuteilen“* ODER Handarbeit im Kalender.<br>• **4. Undo:** Schnelles ⌘Z bei Fehlern.<br>• **5. Einreichen:** Übermittlung an die Schulleitung. |

### Was wird im Alltag FAST NIE gebraucht (und gehört ins `⋯`-Menü)?
- *„Alle Tage leeren“*: Macht man maximal 1-mal alle 2 Jahre.
- *„Zuteilung zurücksetzen“*: Nur bei komplettem Neustart.
- *„PDF-Backup importieren“*: Ein reines Notfall-Werkzeug.
- *„Onboarding-Link kopieren“*: Gehört in die Administration.
- *„System-Hard-Reset“*: Ein extremer Ausnahmefall.

---

## 🍏 3. Der Apple HIG 0,1% Goldstandard Entwurf

Im echten macOS / iPadOS Standard (wie in **Apple Numbers**, **Pages**, **Logic Pro**, **Final Cut Pro**) gliedert sich die Leiste in **drei harmonische, einzeilige Zonen** mit exakt **38px Höhe**:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│  [ Entwurf 1 • 25 ▾ ] [ + ]        │   [ ⊞ 15 Min ▾ ]   [ 👁️ Namen ]   │   [ ↶ Undo ]   [ ✨ Auto-Zuteilen ]   [ ⋯ ]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Zone 1 (Links): Apple Document / Scene Selector
- **Kompakter Apple Scene Popover:** `[ Entwurf 1 (Aktiv • 25) ▾ ]` + dezenter `[ + ]`-Icon-Button.
  - Alternativ (wenn 2-3 Entwürfe): Schlanke Apple Segmented Control: `[ Entwurf 1 • 25 ] [ Entwurf 2 ] [ + ]`.
  - **Strikte Invariante:** `whiteSpace: 'nowrap'`, `flexShrink: 0`. Kein Textumbruch, keine vertikalen Kamine!
  - Beim Klick auf das Dropdown:
    - ✓ Entwurf 1 (25 Schüler • Live geschaltet)
    - Entwurf 2 (25 Schüler • Sandbox)
    - ────────────
    - ✏️ Entwurf umbenennen
    - 📋 Entwurf duplizieren
    - 🗑️ Entwurf löschen (rot, mit Bestätigung)

### Zone 2 (Mitte): Kontextuelle Canvas-Präferenzen
- **Schlankes Raster-Segment:** `[ ⊞ 15 Min ▾ ]` (15 / 30 / 60 Min).
- **Datenschutz-Pille:** `[ 👁️ Namen schützen ]` (Apple HIG Segment-Stil, monochrom).
- **Legende:** Fliegt komplett aus der Werkzeugleiste! Die Information *„Grün = Wunschzeit, Weiß = Ausweichzeit“* wird als subtiler, eleganter Tooltip oder als dezente Fußnoten-Leiste unter dem Stundenplan gerendert, niemals als sperriger Fremdkörper in der Haupt-Toolbar.

### Zone 3 (Rechts): Kontextuelle Aktionen & Aktionen-Menü
- **`[ ↶ ]` (Undo):** Subtiler Apple-Icon-Button, nur aktiv wenn Historie vorhanden (`undoCount > 0`).
- **`[ ✨ Automatisch zuteilen ]`:**
  - **Nur sichtbar/aktiv**, wenn tatsächlich unassigned Schüler im Pool sind (`unassignedCount > 0`).
  - Wenn alle Schüler eingeteilt sind, verschwindet der Button diskret oder tritt zurück – denn die nächste Aktion ist das Einreichen im Lifecycle-Hero darunter!
- **`[ ⋯ ]` (Apple HIG Action Menu):**
  - Konsolidiert alle sekundären und destruktiven Werkzeuge an einem einzigen, sicheren Ort:
    - ── Board-Konfiguration ──
    - ⚙️ Unterrichtszeiten & Tage anpassen
    - ── Aufräumen & Zurücksetzen ──
    - 🔄 Alle Schüler-Zuteilungen leeren
    - 🗑️ Alle Unterrichtstage leeren (rot, mit Warn-Dialog)
    - ── Teilen & Sicherung ──
    - 🔗 Schüler-Onboarding-Link kopieren
    - 📄 PDF-Backup wiederherstellen
    - ── Notfall ──
    - ⚠️ System-Reset (rot)

---

## 🛠️ 4. Konkreter 3-Schritte-Sanierungsplan

### Schritt 1: CSS-Kollaps sofort heilen & Layout fixieren (`ScheduleDesignerStudioBar.tsx`)
1. `whiteSpace: 'nowrap'` auf alle Buttons und Container.
2. `flexShrink: 0` auf `newDraftBtnRef` und alle Segment-Pills (kein Quetschen mehr möglich).
3. `flexWrap: 'nowrap'` auf Center-Tools und Leiste; absolute 38px-Höhenharmonie.

### Schritt 2: Entrümpelung & Apple HIG Tool-Harmonisierung
1. Entfernen des sperrigen Legenden-Kastens aus der Toolbar (Auslagerung als dezenter Tooltip am Raster).
2. Verschieben von `Zurücksetzen` und `Tage leeren` aus der primären Leiste in das `⋯ Mehr`-Menü (HIG Destructive Safety Principle).
3. Kompakteres, elegantes Apple-Design für den Entwurfs-Wähler.

### Schritt 3: Nahtlose Verzahnung mit dem Lifecycle-Hero
1. Perfekter Stacking-Context (`zIndex: 40` Studio-Bar, `zIndex: 10` Hero-Banner).
2. Klare Aufgabenteilung: Studio-Bar = Werkzeuge (Raster, Namen, Undo, Mehr); Hero-Banner = Autopilot & Prozessführung (Zuteilen, Freigeben).

---

## 🛑 Strikter Genehmigungsvorbehalt (Zero Auto-Execute)

Gemäß `.agents/AGENTS.md` stoppt der Agent an diesem Punkt (**STOP**).
Erst nach ausdrücklicher Freigabe des Benutzers im Chat („Freigabe“, „Plan ausführen“ etc.) beginnt Phase 3 der Implementierung.
