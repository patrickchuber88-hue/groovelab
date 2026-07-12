# UX & Design Audit: Green Color Standardization for Campus-Groovelab

This document contains a comprehensive UX and design analysis of all active UI files under `apps/groovelab/src/` containing older or non-standard green color codes. The objective is to standardize these instances to the new emerald green palette (`#10b981` / `#059669`) in alignment with the **Campus-Groovelab** global design system.

---

## 1. Executive Summary

A global design system defined in `index.css` establishes the standard CSS variables for the green brand color:
- `--brand-green`: `#10b981` (Emerald Green)
- `--brand-green-dark`: `#059669` (Dark Emerald Green)
- `--brand-green-light`: `rgba(16, 185, 129, 0.1)`
- `--brand-green-border`: `rgba(16, 185, 129, 0.2)`

However, a code audit identified **66 instances** across active React component files that still use hardcoded `#22c55e` (standard green) for borders, backgrounds, icons, text, and shadows. Standardization should leverage the existing CSS variables where possible, or use the direct hex values `#10b981` and `#059669` to maintain consistency and design cohesion.

---

## 2. Color Mapping Recommendations

| Role / Element Type | Current Value (Hardcoded) | Recommended Standard Value | Rationale |
| :--- | :--- | :--- | :--- |
| **Primary Buttons / Solid Backgrounds** | `#22c55e` | `#10b981` / `var(--brand-green)` | Standard emerald green for buttons and high-visibility badges. |
| **Interactive Text / Links** | `#22c55e` | `#059669` / `var(--brand-green-dark)` | Darker emerald green to meet WCAG AA contrast ratios (4.5:1) on white/light gray backgrounds. |
| **Soft Backgrounds / Container Fills** | `#dcfce7`, `rgba(34, 197, 94, 0.1)` | `rgba(16, 185, 129, 0.1)` / `var(--brand-green-light)` | Soft transparent light green accent matching the emerald theme. |
| **Borders & Focus Highlights** | `2px solid #22c55e` | `2px solid #10b981` / `var(--brand-green-border)` | Clean, non-intrusive border accents. |
| **Shadows / Glow Effects** | `rgba(34, 197, 94, 0.25)` | `rgba(16, 185, 129, 0.25)` | Consistent glow with the correct hue. |
| **Status Indicators (Green Dots)** | `#22c55e` | `#10b981` | Vibrant status indicator. |

---

## 3. Detailed Audit by File

### 3.1. [App.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/App.tsx)
- **Line 83:** `"Vocals": "#22c55e"`
  - *Context:* Instrument list color definitions.
  - *Recommendation:* Update to `#10b981`.
- **Line 128:** `return '#22c55e'; // Green when checked in`
  - *Context:* Kiosk check-in status coloring.
  - *Recommendation:* Update to `#10b981`.
- **Line 6441:** `<CheckCircle size={18} color="#22c55e" />`
  - *Context:* Success Toast checkmark icon.
  - *Recommendation:* Update to `#10b981`.
- **Line 6617:** `background: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)'`
  - *Context:* Gradient banner background.
  - *Recommendation:* Update to `linear-gradient(135deg, #10b981 0%, #059669 100%)`.
- **Line 7225:** `background: activePlatform === 'campus' ? '#22c55e' : '#eab308'`
  - *Context:* Active platform selection indicator background.
  - *Recommendation:* Update to `#10b981`.
- **Line 7663:** `background: '#22c55e', padding: ...`
  - *Context:* Accent button background.
  - *Recommendation:* Update to `#10b981`.
- **Lines 9407 & 9494:** `color: msg.type === 'school' ? '#ef4444' : '#22c55e'`
  - *Context:* Chat message styling for system/school versus personal.
  - *Recommendation:* Update to `#059669` (for better contrast).
- **Line 9563:** `background: 'linear-gradient(135deg, #22c55e, #16a34a)'`
  - *Context:* Chat send button or dynamic gradient.
  - *Recommendation:* Update to `linear-gradient(135deg, #10b981, #059669)`.
- **Line 10673:** `background: '#22c55e', color: 'white' ... border: '2px solid white'`
  - *Context:* Online badge / indicator circle.
  - *Recommendation:* Update to `#10b981`.
- **Line 11567:** `background: '#dcfce7', color: '#22c55e' ... boxShadow: '0 10px 30px rgba(34, 197, 94, 0.2)'`
  - *Context:* Big success confirmation icon wrapper.
  - *Recommendation:* Update background to `var(--brand-green-light)`, color to `#10b981`, and shadow to `rgba(16, 185, 129, 0.2)`.

---

### 3.2. [components/TeacherDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/TeacherDashboard.tsx)
- **Line 400:** `if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'`
  - *Context:* Avatar border default styling logic.
  - *Recommendation:* Update to `#10b981`. (Note: administration roles must use the login hero image instead of musician avatars as per platform rules).
- **Lines 668-669:** `color: '#22c55e'` and `background: '#22c55e', boxShadow: '0 0 12px #22c55e'`
  - *Context:* Header indicator badge.
  - *Recommendation:* Update color/background to `#10b981` (or `#059669` for text contrast) and shadow to matching opacity.
- **Line 706:** `border: isSelf ? '2px solid #22c55e' : ... boxShadow: isSelf ? '0 8px 20px rgba(34,197,94,0.25)'`
  - *Context:* Teacher profile selection border and shadow.
  - *Recommendation:* Update border to `2px solid #10b981` and shadow to `rgba(16, 185, 129, 0.25)`.
- **Line 5231:** `background: '#22c55e'`
  - *Context:* Success circle icon background.
  - *Recommendation:* Update to `#10b981`.
- **Lines 7147, 7173, 7180, 7181:** Schedule slots and borders (`slotBorderLeft = '5px solid #22c55e'`, `border: '3px solid #22c55e'`, `background: '#22c55e'`)
  - *Context:* Calendar schedule highlights.
  - *Recommendation:* Update to use `#10b981` or CSS variables.
- **Lines 10293, 10818, 11145:** Solid backgrounds (`background: '#22c55e'`)
  - *Context:* Action banners/buttons.
  - *Recommendation:* Update to `#10b981`.
- **Line 11634:** Online badge overlay (`background: '#22c55e'`)
  - *Context:* Avatar online status dot.
  - *Recommendation:* Update to `#10b981`.
- **Line 11773:** Active session frame (`border: isSessionActive ? '2px solid #22c55e'`):
  - *Context:* Highlight around active call/session.
  - *Recommendation:* Update to `#10b981`.

---

### 3.3. [components/SecretaryDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/SecretaryDashboard.tsx)
- **Line 248:** `if (lowerName.includes('lehrer') || lowerName.includes('teacher')) return '#22c55e'`
  - *Context:* Profile border defaults.
  - *Recommendation:* Update to `#10b981`.
- **Lines 491-492:** Badge decoration (`color: '#22c55e'`, `background: '#22c55e'`)
  - *Context:* Status headers.
  - *Recommendation:* Update to `#10b981`.
- **Line 14959:** Background checkmark/action (`background: '#22c55e'`)
  - *Context:* Submit/confirm status.
  - *Recommendation:* Update to `#10b981`.
- **Lines 16845, 16847, 16933, 16935, 17044, 17219, 17221, 17401, 17469, 17543:** Custom tables/lists border highlighting (`? '2px dashed #22c55e'` / `? '1.5px solid #22c55e'`)
  - *Context:* Drag & drop dropzone borders, student activation listings.
  - *Recommendation:* Update all to `#10b981` or `--brand-green-border`.
- **Line 17330:** Active listing dot (`background: '#22c55e'`)
  - *Context:* Active indicator.
  - *Recommendation:* Update to `#10b981`.
- **Line 24996:** `isDragOver ? '2px dashed #22c55e'`
  - *Context:* Drag over target border.
  - *Recommendation:* Update to `#10b981`.

---

### 3.4. [components/AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx)
- **Line 48:** `"Vocals": "#22c55e"`
  - *Context:* Instrument visual configuration mapping.
  - *Recommendation:* Update to `#10b981`.
- **Line 195:** `if (name.toLowerCase().includes('lehrer')) return '#22c55e'`
  - *Context:* Profile borders.
  - *Recommendation:* Update to `#10b981`.
- **Lines 1493, 2239, 3351:** Accent text styles (`color: '#22c55e'`)
  - *Context:* Headings/Status highlights.
  - *Recommendation:* Update to `#059669` (Dark Emerald) for legible contrast.
- **Line 10365:** Success indicator (`border: isCopied ? '1.5px solid #22c55e'`)
  - *Context:* Code copy feedback border.
  - *Recommendation:* Update to `#10b981`.
- **Line 12883:** Palette choice configuration (`{ hex: '#22c55e', label: 'Grün' }`)
  - *Context:* System color selector options.
  - *Recommendation:* Update option to `{ hex: '#10b981', label: 'Grün' }`.
- **Line 13039:** Stat bar chart color (`color: '#22c55e'`)
  - *Context:* Student limit indicator bar.
  - *Recommendation:* Update to `#10b981`.
- **Line 16860:** Status selector backgrounds (`background: isActive ? '#22c55e' : '#e2e8f0'`)
  - *Context:* Toggle buttons.
  - *Recommendation:* Update to `#10b981`.

---

### 3.5. Other Active UI Components
- **[components/DeviceSetupScreen.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/DeviceSetupScreen.tsx) (Lines 361, 556, 610):**
  - *Context:* Lehrer text indicator (`color: '#22c55e'`) and helper methods.
  - *Recommendation:* Standardize text to `#059669` or status badges to `#10b981`.
- **[components/CampusSetupScreen.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/CampusSetupScreen.tsx) (Line 26):**
  - *Context:* Default brand color parameter (`brandColor = '#22c55e'`).
  - *Recommendation:* Update default value to `#10b981`.
- **[components/LandingPage.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/LandingPage.tsx) (Line 1188):**
  - *Context:* Icon accent styling (`color: '#22c55e'`).
  - *Recommendation:* Update to `#059669`.
- **[components/MeisterwerkDocumentationModal.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx) (Line 30):**
  - *Context:* Repertoire badge config (`color: '#22c55e'`, `bg: 'rgba(34, 197, 94, 0.1)'`).
  - *Recommendation:* Update color to `#10b981` and bg to `rgba(16, 185, 129, 0.1)`.
- **[components/CampusEventsBoard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/CampusEventsBoard.tsx) (Lines 624, 6313, 9367):**
  - *Context:* Dot background, selected event outline, and check icons.
  - *Recommendation:* Standardize dots and selection outlines to `#10b981`.
- **[components/BandProfileContent.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/BandProfileContent.tsx) (Lines 1539, 1576, 1726):**
  - *Context:* Instrument badge online dot and active status triggers.
  - *Recommendation:* Update to `#10b981`.
- **[components/StudentAvatarDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/StudentAvatarDashboard.tsx) (Lines 1176, 10522):**
  - *Context:* Room details text highlight (`color: '#22c55e'`).
  - *Recommendation:* Standardize to `#059669` (for better contrast against light card background).
- **[components/verwaltung/VerwaltungModule.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/verwaltung/VerwaltungModule.tsx) (Line 140):**
  - *Context:* Activation limits indicator title (`color: props.limitsEnabled ? '#22c55e' : ...`).
  - *Recommendation:* Standardize to `#059669`.
- **[components/groovelab/GrooveLabModule.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/groovelab/GrooveLabModule.tsx) (Line 141):**
  - *Context:* Online check dot (`background: isOnline ? '#22c55e' : '#cbd5e1'`).
  - *Recommendation:* Standardize to `#10b981`.

---

## 4. Next Steps for Implementation

1. **Global Search and Replace Strategy:**
   - A single multi-file replace or targeted code changes can be applied to replace occurrences of `#22c55e` with `#10b981` for background elements, and `#059669` for standalone text nodes on light backgrounds.
2. **Review of Tailwind & Custom Styling Interoperability:**
   - Standardizing these colors directly updates the visual representation of status components, cards, borders, and shadows to match Campus-Groovelab's brand standards.
