# 🏛️ 0,1% Enterprise Goldstandard Remediation: Hausaufgaben-Widget Snapshot-Leck & Audio-Aufnahmen Wochen-Scoping

## 📋 1. Befund- & Ursachen-Analyse

### Problem 1: `SNAPSHOT_LEHRWERKE:[{"title":"Guitar Fitn...` wird als Aufgabe gerendert
1. **Fall-Through im Snapshot-Parser:**
   In [`useAuthoritativeHomeworkPlan.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/hooks/useAuthoritativeHomeworkPlan.ts#L92) und [`AuthoritativeHomeworkContext.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/context/AuthoritativeHomeworkContext.tsx#L117) besitzt die Verzweigung `if (entry.includes('SNAPSHOT_LEHRWERKE:'))` im Gegensatz zu `MICROSCORE:` kein abschließendes `return;`.
   Der Durchlauf fällt ungebremst bis zu `cleanHomeworkNote(entry)` und `notes.push(cleanN)` durch.
2. **Fehlende Bereinigung für Einzelstrings:**
   In [`homeworkSummaryHelper.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/tabs/briefing/homeworkSummaryHelper.ts#L6) filtert `cleanHomeworkNote()` Metadaten (`SNAPSHOT_*`, `AUDIO:*`) nur, wenn der Input als JSON-Array (`[...]`) formatiert ist. Rohe Einzelstrings bleiben unberührt.
3. **Fehlender Defense-in-Depth-Filter:**
   In [`AuthoritativeHomeworkWidget.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/homework/AuthoritativeHomeworkWidget.tsx#L669) rendert `generalNotes.map(...)` ungefiltert alle Strings als Notiz-Karten mit dem Dokumenten-Icon.

### Problem 2: Falsche Zählung „2 Aufnahmen“ (und `+1 weitere`)
1. **Ungefilterte historische Traversierung (`progressItems` Leak):**
   [`useAuthoritativeHomeworkPlan.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/hooks/useAuthoritativeHomeworkPlan.ts#L259) traversiert blind **alle jemals geladenen Zeilen** der `progress_matrix` des Schülers. Audio-Aufnahmen aus früheren Kalenderwochen (KW 38, KW 37) oder aus separaten Song-Übungen werden fälschlicherweise in das aktuelle Wochen-Widget hineingemischt.
2. **Volatile Pre-Signed URL Miss:**
   Deduplizierung über naiven String-Vergleich `a.url === url` scheitert, wenn URLs flüchtige HMAC-Tokens (`?token=...`) oder unterschiedliche Formatierungen (relativer Storage-Pfad vs. absolute URL) aufweisen.
3. **Scope-Verletzung:**
   Das Wochen-Widget visualisiert den aktuellen Wochen-Fahrplan (`Hausaufgabe KW XX`). Historische Aufnahmen gehören ins Archiv / Meisterwerk ("Recordings"), nicht in das aktive Wochen-Widget.

---

## 🛠️ 2. Geplante Änderungen (Chirurgisch & Rückwärtskompatibel)

### Phase 1: Helfer-Härtung ([`homeworkSummaryHelper.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/tabs/briefing/homeworkSummaryHelper.ts))
- **Hermetischer Metadaten-Guard in `cleanHomeworkNote`:**
  Sofortiger Return von `""` für jeden String, der mit Metadaten-Präfixen beginnt oder diese enthält (`SNAPSHOT_`, `AUDIO:`, `MICROSCORE:`, `LOOP:`, `STICKER:`, `SYSTEM:`, `FEEDBACK:`).
- **Kanonischer Audio-Pfad-Extraktor `extractCanonicalAudioStoragePath(urlOrPath: string): string`:**
  Entfernt Query-Parameter (`?token=...`) und extrahiert den reinen Dateipfad zur verlässlichen Deduplizierung.

### Phase 2: Parser- & Hook-Härtung ([`useAuthoritativeHomeworkPlan.ts`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/hooks/useAuthoritativeHomeworkPlan.ts))
- **Saubere `return;`-Abschlüsse in `parseSnapshotPayload`:**
  Sobald `SNAPSHOT_LEHRWERKE:`, `SNAPSHOT_SONGS:` oder `AUDIO:` erkannt und verarbeitet wurden, bricht die Schleifen-Iteration per `return;` ab.
- **Wochen-Scoping für Audio-Aufnahmen:**
  1. Falls ein aktiver Wochen-Snapshot (`Hausaufgabe KW XX`) existiert: Aufnahmen werden **primär und autoritativ** aus diesem Snapshot bezogen.
  2. Nur wenn dort keine Aufnahmen vorliegen: Fallback ausschließlich auf Items der aktuellen Woche (`getItemWeek(item) === currentWeekIso` oder `is_current_homework`), strikter Ausschluss historischer Alt-Wochen.
- **Deduplizierung via kanonischem Storage-Pfad.**

### Phase 3: Context-Parität ([`AuthoritativeHomeworkContext.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/context/AuthoritativeHomeworkContext.tsx))
- Exakt identische Absicherung von `parseSnapshotPayload` (`return;`-Abschlüsse) und Wochen-Scoping für `audioTracks`.

### Phase 4: UI Defense-in-Depth ([`AuthoritativeHomeworkWidget.tsx`](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/student/homework/AuthoritativeHomeworkWidget.tsx))
- Vor dem Rendern von `generalNotes` zusätzliche Filterung: Nur didaktische Klartext-Notizen rendern, niemals Tokens mit `SNAPSHOT_` oder `AUDIO:`.
- `activeAudioTracks` via kanonischem Pfad deduplizieren.

---

## 🔒 3. Invarianten- & Monolith-Ceiling-Prüfung
- Keine der betroffenen Dateien überschreitet die 1.500-Zeilen-Grenze (`useAuthoritativeHomeworkPlan.ts` ~355 Zeilen, `AuthoritativeHomeworkContext.tsx` ~645 Zeilen, `AuthoritativeHomeworkWidget.tsx` ~915 Zeilen, `homeworkSummaryHelper.ts` ~830 Zeilen).
- Keine Regression bei bestehenden Features oder Snapshot-Entpackung.
- Netto-Änderung: < 40 Zeilen chirurgische Anpassungen.
