# 🏛️ 0,1% Enterprise Goldstandard Redesign: Tages-Kompass Off-Day States (`UNTERRICHTSFREI`, `WOCHENENDE`, `ABWESENHEIT`)

## 📋 1. Ausgangslage & Problemanalyse

### Aktueller Zustand (Kritik: „Windows 2000 Tool“)
In [`TagesKompassHost.tsx` (L118–147)](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/teacher/tageskompass/TagesKompassHost.tsx#L118-L147) sind die drei unterrichtsfreien Zustände (`WOCHENENDE`, `UNTERRICHTSFREI`, `ABWESENHEIT`) als minimale, statische 7-Zeilen-Platzhalter umgesetzt:
```tsx
<div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '20px', border: '1px solid #e2e8f0' }}>
  <CalendarOff size={32} color="#64748b" style={{ margin: '0 auto 10px auto' }} />
  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Unterrichtsfreier Tag</h3>
  <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>Heute ist unterrichtsfrei (Schulferien oder Feiertag).</p>
</div>
```

### Weshalb das veraltet wirkt:
1. **Kasten-im-Kasten-Effekt:** Das übergeordnete Widget [`TeacherHausaufgabenWidget.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/teacher/TeacherHausaufgabenWidget.tsx#L780-L790) ist bereits eine abgerundete Glassmorphism-Card. Darin wird eine zweite starre Box mit Rahmen gerendert (klassischer Win32-`GroupBox`-Effekt).
2. **Bürokratisch-negatives Icon:** Das `CalendarOff`-Icon (durchgestrichener Kalender) suggeriert einen Systemfehler oder ein Verbot statt einer wohlverdienten Pause.
3. **Ungenutzte Realdaten:** Das Widget empfängt bereits das berechnete Prop `nextDaySummary` (nächster Unterrichtstag, Terminanzahl, Uhrzeit, Raum). In `TagesKompassWrapUp.tsx` wird dies genutzt, in `UNTERRICHTSFREI` und `WOCHENENDE` jedoch komplett ignoriert.

---

## 🎯 2. Der 0,1% Goldstandard (Zielzustand)

Statt einer sterilen grauen Box erhält der Screen die exakte Design-DNA von `TagesKompassPreflight` und `TagesKompassWrapUp`:

1. **Nahtlose Container-Integration (Zero Box-in-Box):**  
   Kein zweiter Kasten mit innerer Umrandung. Die Fläche atmet durch großzügigen Whitespace und harmonische Typografie.
2. **Konsistenter Tages-Kompass Header:**  
   * Links: Kompass-Icon im dezenten Container + Titel **Tages-Kompass** + Subline (*„Dein Überblick für heute“* / *„Wochenend-Pause“*).
   * Rechts: Dezent gestyltes Status-Pill-Badge (*„Unterrichtsfrei“* / *„Wochenende“* / *„Ausfall aktiv“*).
3. **Vorschau auf den nächsten Unterrichtstag (`nextDaySummary`):**  
   Zeigt der Lehrkraft die reale Information für ihre Wochenplanung:
   > 🗓️ **Nächster Unterricht: Montag, 14. Oktober**  
   > *5 Einheiten ab 13:45 Uhr (Raum 4)*
4. **Keine erfundenen Elemente:**  
   Keine Phantom-Buttons, keine erfundenen Bibliotheken oder Schein-Aktionen. 100% real und an den echten Datenstrom gekoppelt.

---

## 🏗️ 3. Architektur & Bounded Contexts

Um die **Monolith-Ceiling-Regel** ([`AGENTS.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/.agents/AGENTS.md)) einzuhalten, wird [`TagesKompassHost.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/teacher/tageskompass/TagesKompassHost.tsx) nicht mit Inline-UI vergrößert.

### Komponenten-Aufteilung:
1. **Neuer Feature-Satellit:**  
   `apps/groovelab/src/components/teacher/tageskompass/TagesKompassOffDayState.tsx`  
   * Autarker, schlanker Monolith (~120 Zeilen).
   * Kapselt die 3 Zustände: `UNTERRICHTSFREI`, `WOCHENENDE`, `ABWESENHEIT`.
   * Unterstützt optionales `nextDaySummary`.
2. **Orchestrator-Anpassung:**  
   [`TagesKompassHost.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/teacher/tageskompass/TagesKompassHost.tsx) ersetzt die Zeilen 118–147 durch:
   ```tsx
   if (currentState === 'WOCHENENDE' || currentState === 'UNTERRICHTSFREI' || currentState === 'ABWESENHEIT') {
     return (
       <TagesKompassOffDayState
         currentState={currentState}
         teacher={teacher}
         nextDaySummary={nextDaySummary}
       />
     );
   }
   ```
3. **Export-Registrierung:**  
   `apps/groovelab/src/components/teacher/tageskompass/index.ts` exportiert `TagesKompassOffDayState`.
4. **Dokumentation:**  
   Aktualisierung von `CAM-86` in [`docs/SYSTEM_FEATURE_MATRIX.md`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/docs/SYSTEM_FEATURE_MATRIX.md).

---

## 🔒 4. Governance & Qualitätskriterien
- **BFSG 2025 / WCAG 2.2 AA:** Kontrast $\ge 4.5:1$ auf allen Textelementen.
- **Monolith Ceiling:** `TagesKompassHost.tsx` schrumpft sogar leicht (Netto-Reduktion um ~15 Zeilen). `TagesKompassOffDayState.tsx` bleibt weit unter 1.500 Zeilen (~120 Zeilen).
- **TypeScript Strictness:** 100 % typisiert mit den bestehenden Typen aus `types.ts`.
- **Zero-Bypass:** Keine Terminal-Ausführung vor Freigabe.
