# ADR-003: Didaktische UI-Levels (Junior/Teen/Pro) mit DB-SSOT & Realtime Broadcast

- **Status:** Akzeptiert (Pädagogische & Multi-Device Invariante)
- **Datum:** 2026-08 / Re-zertifiziert 2026-09
- **Domäne:** Campus / Didaktik & Cross-Device Sync

---

## Kontext & Problemstellung
Das Campus-Modul passt seine Komplexität didaktisch dem Alter des Schülers an:
- `junior`: Spielerisch, stark bildgestützt, vereinfachte Menüs.
- `teen`: Moderner Social-Feed-Look, direkter Chat, Playlist-Fokus.
- `pro`: Komplette Detailansicht mit Noten-Annotationen, Partitur-Dateien und Profi-Stundenplan.

Eltern konfigurieren diese Stufe häufig auf ihrem Smartphone in der Elternansicht (PWA). Gleichzeitig übt das Kind im Unterricht oder zu Hause auf einem Tablet oder Laptop.
Speichert man diesen Wert nur in `localStorage`, müsste der Schüler die Seite neu laden oder der Zustand wäre asynchron. Eine Manipulation durch den Schüler im Browser wäre möglich.

---

## Entscheidung
1. **Datenbank als SSOT:** Die Spalte `users.campus_ui_level` ist die ausnahmslose Single Source of Truth.
2. **Autoritative Persistierung:** Änderungen durch Eltern laufen über den Server-RPC `save_parent_controls` und werden in `public.audit_logs` revisionssicher protokolliert.
3. **Cross-Origin-Echtzeitsynchronisation:** Jede Änderung wird über Supabase Realtime Broadcast unverzüglich an alle aktiven Instanzen des Schülers (Web, Tablet, PWA) gestreamt.
4. **Zero Reload:** Die UI passt sich auf allen verbundenen Bildschirmen in Echtzeit ohne Seiten-Reload oder Flickern an.
5. **Cache-Invalidierung:** Lokale Caches (`localStorage`) werden beim Start und bei Hintergrund-Refetches deterministisch von der Datenbank überschrieben.

---

## Konsequenzen & Invarianten für den Code
- Niemals darf `campus_ui_level` rein lokal im State oder `localStorage` gehalten werden, ohne dass ein autoritativer DB-RPC vorausging.
- Der Client hört auf den Realtime-Kanal `realtime:users:campus_ui_level`.
