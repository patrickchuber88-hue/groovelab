# ADR-005: Barrierefreiheit nach BFSG 2025 ohne Reduktion von Marken-Akzentfarben

- **Status:** Akzeptiert (Rechtssicherheit & WCAG 2.2 AA Parität)
- **Datum:** 2026-08 / Re-zertifiziert 2026-09
- **Domäne:** Accessibility (a11y), Recht & BFSG 2025 / BITV 2.0

---

## Kontext & Problemstellung
Das Barrierefreiheitsstärkungsgesetz (BFSG 2025) und europäische Vorgaben verlangen für B2B- und B2C-Software die Einhaltung der WCAG 2.2 Stufe AA (u. a. Kontrastverhältnis von mindestens 4,5 : 1 für Fließtext).
Oft begehen Entwickler den Fehler, helle Markenfarben (wie das leuchtende GrooveLab-Gelb `#facc15` oder das Campus-Grün `#34a853`) abzuschwächen, zu vergrauen oder durch hässliche dunkle Brauntöne zu ersetzen, um Kontraste gegen weißen Text zu erzwingen. Dies zerstört die Markenidentität und visuelle Attraktivität der Plattform.

---

## Entscheidung
1. **Unantastbarkeit der Markenfarben:** Das GrooveLab-Gelb (`#facc15` / `#eab308`), Campus-Grün (`#34a853`) und Admin-Rot (`#ea4335`) dürfen **niemals im Hintergrund verändert, abgedunkelt oder entfernt** werden.
2. **Textkontrast-Priorität:** Das geforderte Mindestkontrastverhältnis von 4,5 : 1 (WCAG AA) wird **ausschließlich durch die Anpassung der Text- und Icon-Farbe** auf diesen Hintergründen erreicht. Auf Gelb wird z. B. konsequent Slate-900 (`#0f172a`) eingesetzt, was ein überragendes Kontrastverhältnis von über 12 : 1 erzeugt.
3. **Tastatur-Vollbedienbarkeit:** Jedes interaktive Nicht-Button-Element (`div`, `span`) mit `onClick` erhält `role="button"`, `tabIndex={0}` und `onKeyDown` (Enter/Leertaste).
4. **44×44px Mindest-Trefferzone:** Mobile Touch-Targets halten ausnahmslos den Apple HIG / Material 3 Ergonomiestandard ein.
5. **Juristische Erklärung in LegalTextModal:** Die Erklärung zur digitalen Barrierefreiheit deklariert den Status wahrheitsgemäß und abmahnsicher als **„teilweise vereinbar“** mit berechtigten Ausnahmen nach § 12a Abs. 6 BGG / § 16 BFSG (auditive Live-Inhalte und nutzergenerierte Noten-Uploads).

---

## Konsequenzen & Invarianten für den Code
- Niemals weißen Text (`#ffffff`) auf GrooveLab-Gelb platzieren.
- Alle Modals implementieren `role="dialog"`, `aria-modal="true"` und Escape-Key-Handling.
- Icon-Only-Buttons müssen immer ein `aria-label` und `title` besitzen.
