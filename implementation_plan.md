# Implementierungsplan: Sanierung der Klarnamen-Anzeige & Zero-Knowledge Vault-Synchronisation (0,1% Goldstandard)

## 1. Problemstellung & Fehler-Topologie

Seit Einspielung von **Migration 600** (*Enterprise Zero-Knowledge Identity Vault*) werden Schülernachnamen in `public.users_raw.last_name` und `public.users` datenschutzkonform als 1-Buchstaben-Initial (`N.`) geführt. Die vollen Nachnamen liegen sicher verschlüsselt in `private_auth.blind_student_lastname_vault`.

Beim Klick auf den Schalter **„Klarnamen (60s)“** werden die Klarnamen in sämtlichen Dashboards und Boards jedoch nicht angezeigt. 

### Die 4 Kern-Ursachen:
1. **Fehlender Supabase-Client im Tresor-Helper (`nameHelper.ts`):** `revealClassRosterNamesViaVault` greift auf `(window as any).__supabaseClient` zu. Da dieser im gesamten Monorepo nirgends initialisiert wurde, schlägt der Aufruf sofort lautlos mit `{ success: false, error: 'NO_CLIENT' }` fehl.
2. **Semantik-Inversion in `useRealNamesVisibility()`:** Der Hook liefert `{ visible: privacyMode }`. Wenn der Datenschutz aktiv ist (`privacyMode = true`), ist `showRealNames = true`. Dies führt dazu, dass Buttons (`Klarnamen (60s)` vs. `Vorname N.`) und Aufrufe an `maskLastName(lastName, privacyMode)` logisch verkehrt herum arbeiten.
3. **Fehlende `student.id` (`fallbackId`) in Boards:** Fast alle Aufrufe in `ScheduleCalendarView.tsx`, `ScheduleBoardDesktop.tsx`, `ScheduleBoardMobile.tsx` und `TeacherTagesplanWidget.tsx` rufen `maskLastName(last_name, showRealNames)` **ohne** den 3. Parameter `student.id` auf. Dadurch kann `maskLastName` den Namen selbst bei geladenem Cache nicht aus `window.__glRevealedVaultCache` zuordnen.
4. **PostgreSQL-RPC Restriktion (`reveal_class_roster_names`):** Der RPC verlangt für `role = 'teacher'` zwingend eine `p_pin` und akzeptiert keine bestehenden Session-Leases (im Gegensatz zu Admin/Sekretariat). Zudem blockiert `u.teacher_id = v_caller_id` Schulleitungs-Accounts mit Dual-Role (`['admin', 'teacher']`), wenn sie sich im Lehrer-Workspace befinden.

---

## 2. Geplante Sanierungsmaßnahmen

### Phase 1: PostgreSQL Security Definer RPC Härtung (`supabase/migrations/602_fix_zero_knowledge_vault_dual_role_and_lease.sql`)
1. **Session-Lease Anerkennung für Lehrkräfte & Dual-Role:**
   * Befindet sich der Aufrufer in einer aktiven, gültigen Sitzung (`session_leases`), darf `reveal_class_roster_names` auch ohne erneute PIN-Übergabe aufgerufen werden (z. B. wenn die Lehrkraft bereits authentifiziert ist oder Step-Up aktiv ist).
2. **Dual-Role Schulleitungs-Scoping:**
   * Besitzt der Aufrufer Schulleitungsrechte (`'admin' = ANY(roles)` oder `role IN ('admin', 'secretary')` oder `is_master_admin()`), darf er das gesamte Schulroster (`school_id = v_caller_school`) entschlüsseln, selbst wenn seine Primärrolle in `users_raw` auf `'teacher'` steht.
3. **Idempotenter Rollout:**
   * Ausführung der Migration auf dem Produktionsserver (IONOS).

### Phase 2: Client-Bridge & Vault-Singleton (`apps/groovelab/src/utils/nameHelper.ts` & `apps/groovelab/src/supabase.ts`)
1. **Kanonische Supabase-Client Registrierung:**
   * Export von `setGlobalVaultSupabaseClient(client)` in `nameHelper.ts`.
   * Automatisches Hinterlegen des Clients beim Initialisieren in `apps/groovelab/src/supabase.ts` und `useCampusAppOrchestrator.ts`.
2. **In-Memory Cache Auto-Hydration:**
   * `revealClassRosterNamesViaVault` nutzt verlässlich den hinterlegten Client als Fallback, falls kein Parameter übergeben wird.
   * `toggleVisibility(false)` führt bei verifiziertem PIN / Session-Lease sofort die Entschlüsselung durch und befüllt `window.__glRevealedVaultCache`.
3. **Heilung der Inversion in `useRealNamesVisibility()` & `maskLastName()`:**
   * Der Hook liefert:
     - `areRealNamesVisible: !privacyMode` (True wenn Klarnamen sichtbar sind)
     - `isPrivacyMode: privacyMode` (True wenn maskiert)
     - `visible: !privacyMode` (Rückwärtskompatibel harmonisiert: `visible === true` = Klarnamen sichtbar)
   * `maskLastName(lastName, isMaskedOrPrivacy, fallbackId)` erkennt intelligent, ob der Caller `isPrivacyMode` oder `showRealNames` übergibt, und gleicht prioritär gegen `window.__glRevealedVaultCache.get(fallbackId)` ab.

### Phase 3: Übergabe von `student.id` in allen Boards
1. **`apps/groovelab/src/components/ScheduleCalendarView.tsx` & `ScheduleCalendarViewDesktop.tsx`:**
   * Ergänzung der `fallbackId` (`occ.student?.id`, `change.student?.id`, `evt.student_id`) bei allen `maskLastName`-Aufrufen.
2. **`apps/groovelab/src/components/ScheduleBoardDesktop.tsx` & `ScheduleBoardMobile.tsx`:**
   * Ergänzung der `student.id` bei allen `maskLastName`-Aufrufen.
3. **`apps/groovelab/src/components/admin/AdminStudentsView.tsx` & `TeacherStudentsView.tsx`:**
   * Harmonisierung der Schalter-Zustände (Farben, Icons, Labels) für 100% konsistente Anzeige.

---

## 3. Verifikationsplan
1. **Automatisierte Typescript-Prüfung:** Typecheck im Workspace `apps/groovelab`.
2. **Forensische RPC-Simulation:** Ausführung von `reveal_class_roster_names` via Postgres-Shell auf IONOS mit Peter Pan Session-Lease und Verifikation der 26 entschlüsselten Klarnamen.
3. **UI-Verifikation:** Test des Toggles in der Schülerverwaltung, im Stundenplan und auf dem Termine-Board; Bestätigung, dass innerhalb der 60-Sekunden-Periode die Klarnamen (`Novak`, `Lorenzet`, `Huber` etc.) flüssig angezeigt werden und danach automatisch wieder maskieren.
