# Implementierungsplan: 0,1% Goldstandard Campus-Grün Konsistenz (Übe-Pfad)

## 🎯 Kontext & Problemstellung
Auf der dargestellten Campus **Übe-Pfad**-Seite (`StudentPracticeTab.tsx` & Satellit `PracticeHomeworkCard.tsx`) weicht ein Großteil der grünen UI-Elemente vom autoritativen Campus-Grün ab. Anstelle des CI/CD-Standards wurden uneinheitliche Tailwind-Emerald- (`#10b981`, `#059669`, `#047857`, `#d1fae5`) und Tailwind-Green-Werte (`#16a34a`, `#15803d`, `#dcfce7`) verwendet, während der Primär-Button bereits das autoritative Campus-Grün `#34a853` besitzt.

---

## 🏛️ 0,1% Goldstandard Evaluation (Axiome & Farb-Harmonie)

Gemäß **`theme/tokens.ts`** und dem **Enterprise Monolith Goldstandard (`AGENTS.md`)** gilt für den Campus-Kontext:
* **Primary / Solid Fill**: `#34a853` (Autoritatives Campus-Grün)
* **Surface / Light Background**: `#e6f4ea` (Helle Tonal-Variante von Campus-Grün)
* **High-Contrast Text / Labels (BFSG & WCAG 2.2 AA $\ge 4.5:1$)**: `#137333` (Verhindert Kontrastmängel von `#34a853` auf hellem Grund)
* **Borders / Dividers**: `rgba(52, 168, 83, 0.25)` bzw. `#34a853`

### 🔍 Detaillierte Bestandsaufnahme auf der Übe-Pfad-Seite:

| UI-Element | Aktueller Farbwert (Ist) | Autoritativer Goldstandard (Soll) |
| :--- | :--- | :--- |
| **Header Icon-Badge** („Übe-Pfad“) | `#10b981` (Emerald-500) | `#34a853` (Campus-Grün) |
| **XP-Pill** („1453 XP“) | `#10b981` (Emerald-500) | `#34a853` (Campus-Grün) |
| **Tages-Fokus Pill** („TAGES-FOKUS: 3 MIN.“) | `#10b981` (Emerald-500) | `#34a853` (Campus-Grün) |
| **Activity Ring** (Fortschritts-Kreis) | `#10b981` (Emerald-500) | `#34a853` (Campus-Grün) |
| **Fokuszeit Pill** (unter Timer 03:00) | `#10b981` (Emerald-500) | `#34a853` (Campus-Grün) |
| **Session-Button** („▶ Fokus-Session starten“) | `#34a853` | `#34a853` *(bereits korrekt)* |
| **Ergonomie-Tips** (Icons & Text) | `#16a34a` / `#15803d` | `#34a853` (Icon) / `#137333` (Text) |
| **Wochen-Konsistenz Icon-Badge** | `#10b981` (Emerald-500) | `#34a853` (Campus-Grün) |
| **Wochentag „Erledigt“ Kapsel** | `#d1fae5` / `#047857` | `#e6f4ea` (Bg) / `#137333` (Text) / `#34a853` (Icon) |
| **Wochen-Fokus Header-Icon** | Gradient `#10b981` $\to$ `#059669` | `#34a853` (Solid Campus-Grün) |
| **Badges „3 Aufgaben“ & „S. 2“** | `#dcfce7` / `#15803d` | `#e6f4ea` (Bg) / `#137333` (Text) |
| **Links „Aufgabenheft >“ & „Öffnen >“** | `#16a34a` | `#34a853` (Campus-Grün) |
| **Aufgaben-Karten Akzente & Icons** | `#10b981` / `#16a34a` | `#34a853` (Campus-Grün) |
| **Übe-Chronik & Archiv Header-Icon** | `#10b981` | `#34a853` (Campus-Grün) |
| **Archiv Monats-Badges** (z.B. „0 Übetage“) | `#d1fae5` / `#047857` | `#e6f4ea` (Bg) / `#137333` (Text) |
| **Archiv Mastered Sessions** (Balken & Icons) | `#10b981` / `#16a34a` / `#15803d` | `#34a853` (Akzent) / `#137333` (Text) |
| **Zen-Timer Fokus-Zeit Badge** | `#10b981` | `#34a853` (Campus-Grün) |

---

## 🛠️ Geplante chirurgische Modifikationen

### 1. `apps/groovelab/src/components/student/tabs/StudentPracticeTab.tsx`
* Bereinigung aller Hardcoded Emerald/Green-Werte in der Hauptansicht:
  - Header-Iconbox: `background: '#34a853'`
  - XP-Pill: `background: '#34a853'`
  - Tages-Fokus Badge: `background: '#34a853'`
  - Activity-Ring Arc: `stroke="#34a853"`
  - Fokuszeit-Pill: `background: '#34a853'`
  - Vorbereitungs-Labels & Icons: `#34a853` (Icons), `#137333` (Text)
  - Activity-Iconbox (Wochen-Konsistenz): `background: '#34a853'`
  - Wochentag `isMastered`: `cardBg = '#e6f4ea'`, `dayNameColor = '#137333'`, `iconEl = <CheckCircle size={14} color="#34a853" />`, `subTextColor = '#137333'`
  - Archiv-Iconbox: `iconBadgeBg = '#34a853'` (für non-teen)
  - Archiv Monats-Pills: `background: '#e6f4ea'`, `color: '#137333'`
  - Archiv Session-List: Farbakzente vereinheitlicht auf `#34a853` / `#137333`
  - Zen-Session-Badge & Progress-Arc: `#34a853`

### 2. `apps/groovelab/src/components/student/practice/PracticeHomeworkCard.tsx`
* Bereinigung der Wochen-Fokus-Karte:
  - Header-Iconbox: `background: '#34a853'`
  - Zähler-Badges (`3 Aufgaben`, `S. 2`): `background: '#e6f4ea'`, `color: '#137333'`
  - Links & Chevrons (`Aufgabenheft >`, `Öffnen >`): `color: '#34a853'`
  - Karten-Indikatoren: `borderLeft: '3px solid #34a853'`
  - Audio-Preview-Buttons: `background: '#34a853'`

---

## 🛑 Zwingender Stopp-Punkt (Genehmigungsvorbehalt)
Nach den Projektregeln (`.agents/AGENTS.md`) gilt ein strikter Genehmigungsvorbehalt (Zero Auto-Execute):
* **Keine Codeänderungen ohne deine ausdrückliche Bestätigung.**
* Bitte bestätige kurz mit **„Freigabe“**, **„Genehmigt“** oder **„Plan ausführen“**, damit ich die Anpassung chirurgisch und typ-sicher umsetze.
