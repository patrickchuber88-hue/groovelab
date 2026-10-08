# 🛡️ Implementierungsplan: 100%ige Beseitigung der 4 Wackel-Vektoren im Aufgabenheft (0,1% Enterprise Goldstandard)

## 🎯 Zielsetzung
Vollständige und dauerhafte Beseitigung aller Ursachen für das „Wackeln“, Zittern und Springen im Aufgabenheft (`MeisterwerkDocumentTab`, `MeisterwerkDocumentationModal`, `CampusMainContentRouter`) über alle 4 identifizierten Vektoren unter strikter Wahrung der Monolith-Ceiling-Vorgaben ($\le +15$ Zeilen).

---

## 🔍 Übersicht der 4 Sanierungs-Säulen

| Vektor | Problem | 0,1% Goldstandard Lösung | Betroffene Datei |
| :--- | :--- | :--- | :--- |
| **1. Unbeabsichtigter Jiggle-Modus** | Kacheln rotieren unendlich (-1° bis +1°), ausgelöst durch unbewussten 500ms Long-Press auf Tablets oder Klick auf „Anpassen“. | • Long-Press auf Touchscreens entfernen (Modul-Anordnung erfolgt intentional über den „Anpassen“-Button).<br>• Klick außerhalb der Kacheln beendet den Modus automatisch (`setIsModuleEditMode(false)`).<br>• 20s Inaktivitäts-Timeout beendet den Jiggle-Modus selbsttätig. | `MeisterwerkDocumentTab.tsx` |
| **2. Layout-Thrashing & Doppel-Scrollbar** | Desktop-`<main>` hat `overflowY: 'auto'`, innere Bühne hat `calc(100vh - 120px)`. Bei minimalem Höhenüberhang flackert der Scrollbalken und staucht das 2-Spalten-Layout um 15px. | • Für `['homework', 'homework_book']` erhält `<main>` auf Desktop strikt `overflowY: 'hidden'`.<br>• Das eingebettete Modal nutzt `height: '100%'` (Flexbox) statt starrer `calc(100vh - 120px)`.<br>• Scroll-Container erhalten `scrollbar-gutter: stable` gegen Breiten-Zucken. | `CampusMainContentRouter.tsx`, `MeisterwerkDocumentationModal.tsx`, `MeisterwerkDocumentTab.tsx` |
| **3. Hover-Scale Kanten-Oszillation & Subpixel-Jitter** | `transform: scale(1.02)` / `scale(1.03)` mit `!important` und inline `scale(1.2)` lassen Kanten bei Mausberührung mit 60 Hz oszillieren; Safari rendert Text dabei unscharf. | • `.hover-scale` auf geschmeidige Vertikal-Verschiebung (`transform: translateY(-1px)`) und subtile Helligkeitsanhebung umstellen (keine Hitbox-Expansion an den Kanten).<br>• Inline-JS `transform = 'scale(1.2)'` tilgen.<br>• GPU-Compositing via `transform: translateZ(0)` gegen Safari-Font-Blur. | `apps/groovelab/src/index.css`, `MeisterwerkDocumentTab.tsx` |
| **4. Breakpoint-Schwingung & Render-DOM-Queries** | `document.querySelector` im Renderrumpf von `MeisterwerkDocumentationModal.tsx` bremst Rendering; harter 768px Breakpoint springt bei Scrollbar-Erscheinen. | • Imperative DOM-Queries in `useEffect` verlagern.<br>• Entprellung und Stabilisierung des Breakpoint-Wechsels. | `MeisterwerkDocumentationModal.tsx` |

---

## 🛠️ Geplante chirurgische Maßnahmen (Schritt für Schritt)

### Phase 1: Vektor 2 (Single Scroll SSOT & Layout-Thrashing-Beseitigung)
1. In `CampusMainContentRouter.tsx`:
   - In Zeile 290–293: Für `['homework', 'homework_book'].includes(activeStudentTab)` auf Desktop `overflowY: 'hidden'` setzen (nur der innere Notenheft-Bereich scrollt, die Gesamthülle bleibt felsenfest verankert).
2. In `MeisterwerkDocumentationModal.tsx`:
   - Zeile 3836: `height: (isMobileOrSim || isMobileView) ? '100%' : 'calc(100vh - 120px)'` ersetzen durch `height: '100%'` mit `minHeight: 0`, sodass die Komponente natürlich und ohne Pixel-Überhang den Flex-Raum ausfüllt.
3. In `MeisterwerkDocumentTab.tsx`:
   - Zeile 8794: An der Schülervorschau-Bühne (`KÖRPER 1: DAS NOTENHEFT`) `scrollbarGutter: 'stable'` ergänzen.

### Phase 2: Vektor 1 (Jiggle-Modus Härtung & Entschärfung)
1. In `MeisterwerkDocumentTab.tsx`:
   - Zeile 4130: `onTouchStart={handleTouchStartTile}` entfernen bzw. entschärfen, damit versehentliches Berühren auf Tablets/iPads nicht den Jiggle-Modus startet.
   - Globalen Click-Outside-Listener und Inaktivitäts-Timer einbauen, der `isModuleEditMode` nach 20 Sekunden ohne Interaktion oder bei Klick außerhalb automatisch auf `false` setzt.

### Phase 3: Vektor 3 (Hover-Scale Kanten-Oszillation & Safari Subpixel-Fix)
1. In `apps/groovelab/src/index.css`:
   - Zeilen 1484–1497: `.hover-scale` und `.hover-scale-mini` auf `transform: translateY(-1px)` statt `transform: scale(1.02)` umstellen und `transform: translateZ(0)` zur GPU-Fixierung ergänzen.
2. In `MeisterwerkDocumentTab.tsx`:
   - Zeile 9861: Das inline `transform = 'scale(1.2)'` am Vorlese-Button durch CSS-Klasse ohne Kantenverzerrung ersetzen.

### Phase 4: Vektor 4 (DOM-Query-Entlastung)
1. In `MeisterwerkDocumentationModal.tsx`:
   - Zeilen 199–200: `document.querySelector` im Renderrumpf bereinigen und in einen sauberen State/Effect überführen.

---

## 🏛️ Monolith Ceiling & Goldstandard Invarianten
- `MeisterwerkDocumentTab.tsx`: Aktuell 11.230 Zeilen (Baseline: 11.222; Puffer: $\le 11.237$). Alle Änderungen sind Netto-Null oder Netto-Schrumpfung.
- `MeisterwerkDocumentationModal.tsx`: Aktuell 4.015 Zeilen (Baseline: 4.017).
- `CampusMainContentRouter.tsx`: 787 Zeilen.
- Kein Einsatz von `any`, `@ts-ignore` oder Fremdbibliotheken.

---

## 🛑 Stopp-Punkt & Freigabe
Gemäß der strikten **Implementierungsplan-Governance** stoppt die Ausführung hier. Erst nach deiner ausdrücklichen Freigabe wird mit der Implementierung begonnen.
