---
name: campus-a11y-bfsg
description: >-
  Barrierefreiheits- und Accessibility-Architekt für Campus-Groovelab nach BFSG
  (Barrierefreiheitsstärkungsgesetz ab 28. Juni 2025) und WCAG 2.2 Level AA.
  Sichert Kontrast-Parität (>= 4,5:1), Tastatur-Vollbedienbarkeit, WAI-ARIA Semantik
  und schützt strikt die Desktop Layout Immunity.
---

# ♿ Campus-Groovelab Accessibility & BFSG / WCAG 2.2 AA Standard

Verwende diesen Skill, wenn UI-Komponenten, Dialoge, Formulare, Boards oder Buttons in Campus oder GrooveLab entwickelt, überarbeitet oder auf Konformität mit dem Barrierefreiheitsstärkungsgesetz (BFSG / WCAG 2.2 AA) geprüft werden.

---

## 1. Die 5 Säulen des BFSG / WCAG 2.2 AA Goldstandards

### Säule 1: Desktop Layout Immunity (Unantastbares Desktop-Grid)
* **Axiom**: Barrierefreiheits-Anpassungen dürfen **NIEMALS** bestehende Desktop-Layouts (`min-width: 768px` bzw. `1024px`) zerschießen, Grids verschieben oder Zeilen ungewollt umbrechen.
* **Trennung**: Responsive Optimierungen (z. B. 44x44px Touch-Targets) gelten für mobile Breakpoints (`<= 768px`). Desktop-Navigationen und Tabellen behalten ihre etablierte Kompaktheit und Ausrichtung.

### Säule 2: Kontrast-Parität (Mindestens 4,5:1 für Fließtext)
* **Farb-Identität wahren**: Die didaktischen und Marken-Farben (Campus-Grün, GrooveLab-Gelb/Gold, Admin-Rot) bleiben zu 100 % erhalten.
* **Härtung über Typografie**: Wenn ein farbiger Hintergrund (z. B. gelbe Badges oder hellgrüne KPI-Cards) unzureichenden Kontrast zu weißem Text aufweist, wird der Text auf `text-slate-900` / `#0f172a` gesetzt, anstatt die Hintergrundfarbe zu verwaschen.
* **Großtext & Icons**: Mindestkontrast von **3:1** gegenüber dem umgebenden Hintergrund.

### Säule 3: Tastatur-Vollbedienbarkeit (Zero Mouse Dependency)
Jedes interaktive Element (Karten, Badges mit Klickfunktion, Modale) muss ohne Maus lückenlos steuerbar sein:
```tsx
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }}
  className="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
>
  {/* Content */}
</div>
```
* **Fokus-Sichtbarkeit**: Jedes fokussierte Element MUSS einen deutlich sichtbaren Fokus-Indikator besitzen (`focus-visible:ring-2`).
* **Keine Tastatur-Fallen**: Modale und Dialoge müssen mit der `Escape`-Taste schließbar sein und den Fokus logisch einfangen (*Focus Trap*).

### Säule 4: WAI-ARIA & Screenreader-Semantik
* **Icon-Buttons**: Jeder Button, der nur ein Icon enthält, MUSS ein `aria-label` tragen:
  ```tsx
  <button aria-label="Schülerprofil schließen" onClick={onClose}>
    <X className="w-5 h-5" />
  </button>
  ```
* **Zustände**: Akkordeons und Dropdowns müssen `aria-expanded={isOpen}` signalisieren.
* **Echtzeit-Updates**: Benachrichtigungen oder Chat-Meldungen müssen für Screenreader in einer `aria-live="polite"` Region gerendert werden.

### Säule 5: Unifarben- & Monochrom-Kontur-Axiom (Zero Color-Clash)
* Farbige Buttons oder Widgets müssen unifarben sein.
* Besitzt ein Element einen farbigen Hintergrund, ist ein Rand in einer abweichenden Farbe streng verboten (`border: 'none'` ist der Standard; homogene Tone-in-Tone Nuancen oder weiße/transluzente Lichtkanten sind zulässig).
* Ghost-/Outline-Stil (weißer Hintergrund mit farbigem Rand) ist 100 % konform.

### Säule 6: Dropdown & Popover Stacking Context Elevation & Interaction Hygiene (0,1% Goldstandard)
* **Stacking-Context Isolation (W3C Compositing Spec)**: Elemente mit GPU-Transform (`.hover-scale` mit `transform: translateZ(0)`) erzeugen einen isolierten Stacking Context. Ein Kind-Dropdown kann diesen niemals verlassen. Daher MUSS die Host-Karte ihren Z-Index dynamisch anheben:
  ```tsx
  // Host-Karte / Zeile
  <div style={{ position: 'relative', zIndex: isOpen ? 50 : 1 }} className="hover-scale">
  ```
* **Interaction Hygiene & Dismissibility**: Dropdowns müssen bei Klick außerhalb (`mousedown`) und Betätigen der `Escape`-Taste reaktionslos schließen:
  ```tsx
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);
  ```
* **WAI-ARIA Blueprint**:
  - Trigger-Button: `aria-haspopup="listbox"`, `aria-expanded={isOpen}`, rotierender Chevron (`transform: isOpen ? 'rotate(180deg)' : 'none'`).
  - Menü: `role="listbox"`, `aria-label="..."`, `zIndex: 100` (bzw. `var(--z-dropdown-popover)`).
  - Optionen: `role="option"`, `aria-selected={current === val}`.

---

## 2. Automatisierte Pre-Flight Checkliste (A11y)

Vor dem Freigeben einer UI-Komponente:
- [ ] Besitzen alle `onClick`-Divs ein `role="button"`, `tabIndex={0}` und `onKeyDown` für Enter/Space?
- [ ] Haben reine Icon-Buttons ein aussagekräftiges deutsches `aria-label`?
- [ ] Weisen alle Textfarben auf farbigen KPI-Hintergründen mindestens 4,5:1 Kontrast auf?
- [ ] Lässt sich das Desktop-Layout ohne horizontale Scrollbalken oder verschobene Grids bedienen?
- [ ] Bleiben farbige Buttons strikt unifarben (kein Color-Clash zwischen Füllung und Rahmen)?
- [ ] Heben Karten/Listenzeilen mit Dropdown ihren Stacking Context bei geöffnetem Zustand dynamisch an (`zIndex: isOpen ? 50 : 1`) und schließen bei Klick außerhalb / Escape?
