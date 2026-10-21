# 🍏 APPLE 2-FARBEN DESIGN SYSTEM GOLDSTANDARD
**Campus-Groovelab Enterprise UI/UX Architectural Specification**  
*Geltungsbereich: Alle Frontends, Screens, Badges, Buttons, Widgets, Cards & Modals*

---

## 1. DAS KERNAXIOM: DIE 2-FARBEN-DOKTRIN (ZERO COLOR-CLASH)

Jedes visuelle Element (Button, Status-Badge, Filter-Pill, Tag, Card-Chip, Selektor) darf **niemals mehr als 2 Farben** gleichzeitig nutzen.
Das historische **3-Farben-Sandwich** (z. B. blassgrüner Hintergrund + dunkelgrüner Rand + Schrift) ist im gesamten System streng verboten.

> **Die goldene Apple-Regel:**  
> Ein Element besitzt **entweder** eine farbige Füllung **oder** eine farbige Kontur – **niemals beides in unterschiedlichen Nuancen**.

---

## 2. DIE DREI KANONISCHEN ZUSTÄNDE (APPLE HIG PARITÄT)

### Zustand 1: FILLED (Hero / Primär / Aktiv)
* **Verwendung:** Primäre Handlungsaufforderungen (CTAs), aktive Reitertabs, bestätigte Buchungen, Höchste Priorität.
* **Hintergrund:** 100 % gesättigte Markenfarbe.
  - 🟢 Campus: `#34a853` (Kanonisches Campus-Grün laut Server SSOT)
  - 🟡 GrooveLab: `#eab308` (oder `#facc15`)
  - 🔴 Admin/Sekretariat: `#ea4335`
* **Rand / Kontur:** Ausnahmslos **`border: none`** (bzw. `border: 0`).
* **Typografie & Icon:**
  - Campus & Admin: Reinweiß (`#ffffff`) mit starkem Kontrast.
  - GrooveLab: Deep Black / Slate-900 (`#0f172a`) mit > 12:1 Kontrastverhältnis.
* **Wirkung:** Taktil, selbstbewusst, maximale Signalwirkung ohne optischen Kantenballast.

### Zustand 2: SOFT TINTED (Sekundär / Status-Pill / Info-Badge)
* **Verwendung:** Didaktische Statusmeldungen (z. B. „Bestätigt“, „Erledigt“), Zeitstempel, Tags, passive Kennzeichnungen.
* **Hintergrund:** Transparente 8–12 % Deckkraft der Markenfarbe bzw. Clean Tint.
  - 🟢 Campus: `rgba(52, 168, 83, 0.10)` (bzw. `#e6f4ea`)
  - 🟡 GrooveLab: `rgba(234, 179, 8, 0.12)`
  - 🔴 Admin/Sekretariat: `rgba(234, 67, 53, 0.10)`
* **Rand / Kontur:** Ausnahmslos **`border: none`** (bzw. `border: 0`).
* **Typografie & Icon:** Satter, gut lesbarer Markenton (🟢 Campus: `#34a853` [Kanonisches Campus-Grün], 🟡 GrooveLab: `#854d0e`, 🔴 Admin: `#991b1b`), der die WCAG 2.2 AA Kontrastnorm ($\ge 4,5:1$) garantiert.
* **Wirkung:** Beruhigt das Gesamtbild, lässt Typografie atmen, eliminiert den „Käfig-Effekt“.

### Zustand 3: GHOST / OUTLINE (Tertiär / Inaktiv / Neutral)
* **Verwendung:** Inaktive Filter, Sekundärbuttons, neutrale Umrandungen auf hellem Grund.
* **Hintergrund:** Reinweiß (`#ffffff`) oder Transparent (`transparent`).
* **Rand / Kontur:** 1px sauberer, einfarbiger Rand (z. B. `1px solid #34a853` oder neutral `1px solid #e2e8f0`).
* **Typografie & Icon:** Passend zur Randfarbe (z. B. `#34a853` oder `#475569`).
* **Wirkung:** Filigran, aufgeräumt, keine konkurrierenden Flächen.

---

## 3. BOUNDED CONTEXT MATRIX

| Kontext | 1. Filled (`border: none`) | 2. Soft Tint (`border: none`) | 3. Ghost Outline |
| :--- | :--- | :--- | :--- |
| **🟢 Campus** | `bg: #34a853`<br>`text: #ffffff` | `bg: rgba(52, 168, 83, 0.10)`<br>`text: #34a853` | `bg: transparent`<br>`border: 1px solid #34a853`<br>`text: #34a853` |
| **🟡 GrooveLab** | `bg: #eab308`<br>`text: #0f172a` | `bg: rgba(234, 179, 8, 0.12)`<br>`text: #854d0e` | `bg: transparent`<br>`border: 1.5px solid #eab308`<br>`text: #854d0e` |
| **🔴 Admin / Sekretariat**| `bg: #ea4335`<br>`text: #ffffff` | `bg: rgba(234, 67, 53, 0.10)`<br>`text: #991b1b` | `bg: transparent`<br>`border: 1px solid #ea4335`<br>`text: #ea4335` |

---

## 4. CODE-GUARD & VERIFIKATION
* Neue Komponenten oder Stylesheets MÜSSEN den Test in `scripts/button_interaction_guard.mjs` (Check 8) bestehen.
* Inline-Styles wie `background: '#e6f4ea', border: '1.5px solid #34a853', color: '#1e7e34'` sind ein Gate-Abbruchkriterium.

---

## 5. TYPOGRAFISCHE INTEGRITÄT & ZERO-WORD-SPLITTING (0,1% GOLDSTANDARD)

* **Ganzwort-Integrität (Word Integrity):** Wörter natürlicher Sprache dürfen beim Skalieren des Viewports oder Containers NIEMALS mitten im Wort getrennt, zerrissen oder in 1-Buchstaben-Kaskaden gezwungen werden.
* **Verbot von `word-break: break-all`:** `break-all` ist auf Texten, Labels, Headings und Buttons ausnahmslos verboten.
* **Regulärer Soft-Wrap:** Text bricht ausschließlich an regulären Leerzeichen (`word-break: normal; overflow-wrap: break-word; text-wrap: pretty;`).
* **Atomare UI-Einheiten:** Badges, Status-Pills, Action-Buttons, Tags und Wertepaare (`120 €`, `45 Min`) sind unteilbare Einheiten und werden durch `whitespace-nowrap shrink-0` bzw. geschützte Leerzeichen (`&nbsp;`) vor Zeilenumbruch geschützt.
* **Adaptive Layout-Immunität:** Droht Platzmangel auf kleinen Viewports oder in engen Spalten, erfolgt die Anpassung AUSNAHMSLOS durch adaptive Layout-Mutation (z. B. `flex-wrap: wrap`, Umschaltung von `flex-row` auf `flex-col`, Ausnutzung vertikalen Raums oder `clamp()`-Typografie) – NIEMALS durch Quetschen von Textcontainern auf Sub-Wortbreiten.
* **Technische Ausnahme:** Ausschließlich kryptografische Hashes, UUIDs, IBANs und URLs dürfen isoliert mit `break-all font-mono select-all` formatiert werden.
