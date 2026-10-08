# 🔬 Forensische 0,1% Goldstandard-Analyse & Masterplan für die 6 Punkte

## 1. Forensischer Befund für alle 6 Punkte

### Punkt 1: Warum Tastatur-Eingaben nicht funktionierten (Root-Cause-Kette)
1. **Focus-Trap auf dem Titel-`<input>` in Safari:**
   * Beim Öffnen des Modals greift die Barrierefreiheits-Engine (`useModalA11y`) oder der Browser-Default und fokussiert das erste Eingabefeld (`<input value={snippet.title} ... />`).
   * In `MicroScoreStaffNotation.tsx` lautet Zeile 161:
     ```ts
     if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
     ```
   * Da der Titel fokussiert war, verwarf der Listener jeden einzelnen Tastendruck (`0–9`, `C–H`, Pfeiltasten) sofort.
   * Auf macOS Safari behält ein `<input>` den Fokus, selbst wenn man auf das SVG klickt, solange der Container kein `tabIndex={0}` und keinen expliziten `.focus()`-Aufruf besitzt!
2. **React Re-render Cleanup Race Condition:**
   * `snippet` lag im Dependency-Array des `useEffect`-Hooks.
   * Wurde eine Note gesetzt (`onUpdateNotes`), erzeugte das Eltern-Modal ein neues `snippet`-Objekt.
   * Der Cleanup-Hook des `useEffect` feuerte unmittelbar und führte `clearTimeout(fretBufferRef.current.timer)` aus.
   * Dadurch wurde der automatische Weiterrück-Timer (650ms) vorzeitig gelöscht – der Cursor blieb blockiert.
3. **Hardcodierte Schrittweite:**
   * Der Cursor rückte starr um `2` (Achtel) vor, anstatt die `activeDuration` (z. B. Viertel = 4 Sechzehntel) zu berücksichtigen.

---

### Punkt 2: Audiowiedergabe wie in der „Musik-Weltreise“
* **Die Weltreise-Audioarchitektur (`worldTourAudioEngine.ts`):**
  * Verwendet keine starren synthetischen Töne, sondern zwei warme Oszillatoren: Fundamental-Dreieck + Oktave-Sinus (`hz * 2`).
  * Warmes Tiefpassfilter (`Math.min(2400, hz * 4)` mit $Q = 1.1$).
  * Feine ADSR-Hüllkurve: 16ms Attack (weicher Anstrich/Zupf), 60ms Decay, warmer Sustain, 220ms Release.
  * Beim Abspielen: Flüssiger visueller Noten-Glow (`activeNoteIdx` in Smaragdgrün/Bernstein) und präzises Woodblock-Metronom.
* **Übertragung auf Micro-Score:**
  * Wir adaptieren den Weltreise-Klangkern direkt in `microScoreAudioSynthesizer.ts`, sodass jeder Ton den gleichen vollen, warmen und edlen Sound wie in der Musik-Weltreise besitzt.

---

### Punkt 3: Automatische Takterkennung & Takt-Überleitung
* **Das Problem im Screenshot:**
  * Takt 1 und Takt 2 zeigen `✓ 4/4 voll` (16 Sechzehntel belegt).
  * Wenn Takt 1 voll ist (z. B. 4 Viertel eingegeben), muss die Eingabe nahtlos und vollautomatisch auf **Takt 2, Beat 1 (Fraction 0)** überleiten!
  * Ist auch Takt 2 voll und sind weitere Takte vorhanden (z. B. bei 3 oder 4 Takten), leitet das System auf Takt 3 über.
* **Lösung:**
  * Berechnung der belegten Sechzehntel im aktiven Takt. Sobald `occupiedSixteenths + noteSixteenths >= 16`, rückt der Cursor automatisch auf `barIndex + 1, fraction: 0` vor!

---

### Punkt 4: Exakte Erkennung des Übungsnamens (Seiten & Nummern bei Lehrwerken)
* **Der Befund im Code:**
  * In [`MeisterwerkDocumentTab.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/MeisterwerkDocumentTab.tsx) Zeile 11409 wurde bisher nur `taskTitle={item.title}` übergeben (z. B. nur *"Guitar Fitness"*).
  * Die vorhandenen Metadaten `item.pages` (z. B. `[12]`) und `activeHwExercises` (z. B. `["Üb. 3"]`) wurden ignoriert!
  * Zudem erzeugte `taskId: book-${item.title}` für alle Übungen desselben Buchs denselben Schlüssel, wodurch sie sich gegenseitig überschrieben.
* **0,1% Lösung:**
  * Wir bauen einen deterministischen Titel- und ID-Generator:
    $$\text{taskTitle} = \text{„Guitar Fitness (S. 12 · Üb. 3)“}$$
    $$\text{taskId} = \text{„book-Guitar Fitness-p12-ex3“}$$
  * Damit ist jede Übung eindeutig identifiziert und überschreibt niemals andere Seiten des gleichen Lehrwerks!

---

### Punkt 5: Radikale pädagogische Reduktion (Was ist obsolet?)
* **Der Befund im Screenshot:**
  * Auf dem Bildschirm waren **zwei identische Werkzeugleisten** übereinander gestapelt:
    1. Obere Leiste: Saite `e B G D A E`, Bund `0..12`, Pause, Löschen.
    2. Untere Leiste: Tonhöhe `C..H`, Oktave `2..6`, Saite `e..E`, Bund `0..12`.
* **Urteil als Weltklasse Senior-Pädagoge:**
  * Gitarren- und Bassschüler sowie Lehrkräfte denken bei Tabulatur in **Saite & Bund**.
  * Doppelte Saiten und doppelte Bünde sind verwirrend und unprofessionell.
  * **Die Bereinigung:**
    * **Gitarre / Bass:** Eine einzige, ultra-elegante Apple-Toolbar mit **Saiten-Pills `[ e | B | G | D | A | E ]`** und **Bund-Pills `[ 0 .. 12 ]`** sowie `[ 𝄽 Pause ]` und `[ ⌫ Löschen ]`.
    * **Tasten-/Blasinstrumente:** Automatische Umschaltung auf **Tonhöhe `[ C | D | E | F | G | A | H ]`** mit Oktav-Schalter.
    * Keine redundanten Doppel-Boxen mehr!

---

### Punkt 6: Visualisierung der Notenwerte (Schluss mit Tofu-Boxen)
* **Der Befund im Screenshot:**
  * Die Notenwert-Buttons zeigten leere Unicode-Kästchen `[ ] [ ] [ ] [ ] [ ]`, weil Safari die exotischen musikalischen Zeichen (`𝅝`, `𝅘𝅥`) nicht im Standard-Font rendern kann.
* **0,1% Lösung:**
  * Ersatz durch krispe, gestochen scharfe **Vektor-SVGs** (Bravura / SMuFL SMuFL-Standard):
    * **Ganze Note (`1`):** Elegantes offenes Noten-Oval `1/1`
    * **Halbe Note (`2`):** Offenes Oval mit Hals `1/2`
    * **Viertelnote (`4`):** Gefülltes Oval mit Hals `1/4`
    * **Achtelnote (`8`):** Gefülltes Oval mit Hals und Fähnchen `1/8`
    * **16tel-Note (`16`):** Gefülltes Oval mit Doppelfähnchen `1/16`
  * 100 % plattformunabhängig gestochen scharf auf allen Macs, iPads, iPhones und PCs!

---

## 2. Der 4-Phasen-Implementierungsplan

1. **Phase 1: Tastatur-Fokus & Re-Render Entkopplung (`MicroScoreStaffNotation.tsx`)**
   * Container erhält `tabIndex={0}` und Autofokus bei Schritt 2.
   * Klick auf das Notensystem setzt sofort den Fokus auf den Container (`containerRef.current?.focus()`).
   * Tastatur-Listener prüft, ob wirklich aktiv im Titel getippt wird; andernfalls gehört der Keydown dem Notensystem.
   * `fretBufferRef` wird von React-Re-renders entkoppelt (kein vorzeitiges `clearTimeout`).
   * Schrittweite richtet sich dynamisch nach `activeDuration`.

2. **Phase 2: Weltreise-Klangästhetik (`microScoreAudioSynthesizer.ts`)**
   * Implementierung des warmen Dual-Oszillator Cantabile-Klangkörpers (Triangle + Octave Sine + Q-Filter) aus der Musik-Weltreise.

3. **Phase 3: Takt-Überleitungs-Automatik & Titel-Präzision**
   * Automatische Takt-Weiterschaltung bei 4/4-Vollstand.
   * Lehrwerk-Titel in [`MeisterwerkDocumentTab.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/meisterwerk/MeisterwerkDocumentTab.tsx) übernimmt `S. {page}` und `Üb. {exercise}`.

4. **Phase 4: Pädagogische Einheits-Palette & Notenwert-SVGs**
   * Verschmelzung der redundanten Paletten zu einer einzigen, aufgeräumten Apple-Toolbar.
   * Gestochen scharfe Inline-SVGs für Ganze, Halbe, Viertel, Achtel und 16tel Noten (0 Tofu-Boxen).
