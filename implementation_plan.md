# Implementierungsplan: Forensische 360° Reparatur aller kaputten Tabellen & Schema-Cache-Alignment [0,1% Goldstandard]

## 1. Executive Summary & Forensischer Befund (360° Root Cause Analysis)

Beim Anlegen einer neuen Musikschule im Master-Admin-Leitstand (*„Neue Musikschule einbinden“*) bricht der Vorgang mit einer modalen Fehlermeldung ab (siehe Screenshot):
```
Fehler beim Anlegen der Musikschule: Could not find the 'invite_expires_at' column of 'schools' in the schema cache
```

Eine lückenlose, forensische 360°-Analyse der Live-PostgreSQL-Datenbank (`deployuser@85.215.73.216`), des PostgREST-Schema-Caches und aller Frontend-Workspaces (`apps/` und `packages/`) brachte die tieferliegende Ursache sowie **weitere defekte und fehlende Tabellen** ans Licht:

### 🔴 Der fundamentale Auslöser (Root Cause)
1. **Migrations-Ledger-Diskrepanz:**
   In `scripts/apply_pending_migrations.sh` (Zeilen 48–65) wurden am 10. Oktober 2026 alle Migrationen von 1 bis 539 pauschal als `baseline` in `private_auth.schema_migrations_ledger` registriert. Zahlreiche Migrationen wurden jedoch auf der Live-Datenbank **tatsächlich nie ausgeführt**, weil sie zuvor an Fehlern abbrachen (z. B. Fremdschlüssel auf den View `users` statt die Basistabelle `users_raw`, Typeninkompatibilitäten `BIGINT = UUID` oder fehlendes `DROP FUNCTION ... CASCADE` bei Änderung des Return-Types).
2. **PostgREST-Schema-Cache-Drift auf `public.schools`:**
   Beim Aufruf von `supabase.from('schools').insert(schoolPayload)` sendet `ProvisionSchoolModal.tsx` die Felder `invite_expires_at`, `invite_token`, `operator_notes`, `phone`, `trial_until` und `is_approved`. Da Migration 352 wegen eines Return-Type-Konflikts in `get_master_schools_overview()` abbrach, existierten diese Spalten nicht in `public.schools`. PostgREST verweigerte den Insert und brach ab.
3. **Weitere 22 nicht-funktionale oder fehlende Tabellen/Views im Gesamtsystem:**
   Durch die unvollständige historische Migration fehlen essentielle Tabellen für Master-Admin-Tabs, Didaktik und Crisis-Management bzw. führen zu stillen Fehlern oder leeren Ansichten:
   - `platform_feedback` (Master Admin Feedback-Tab `FeedbackTab.tsx` / `FeedbackHubModal.tsx` leer)
   - `global_broadcasts` (Master Admin Executive-Tab Wartungsmodus schlägt fehl)
   - `band_rehearsals` (GrooveLab Band-Profil Probenplanung wirft Fehler)
   - `lesson_makeup_tokens` (Krisenmanagement & Lehrkraft-Schülerdetail wirft Fehler)
   - `student_ranking_profiles`, `student_nickname_history`, `student_groove_scores`, `student_ear_scores` (Campus Gamification & Leaderboards werfen Fehler wegen `bigint = uuid` Operator-Konflikt)
   - `teacher_sandbox_entries` (Lehrer-Studio Sandkasten scheitert an View-Referenz `users`)
   - `student_worldtour_progress` (Didaktische Weltreise scheitert an View-Referenz `users`)
   - `audio_milestones` & `audio_recordings` (Audio-Biografie scheitert an `tenant_id bigint` Typenkonflikt)
   - Kompatibilitäts-Drift: Aufrufe auf `pending_students`, `presence_sessions`, `user_skills`, `student_teachers`, `student_notes`, `shouts` scheitern, da der Code Legacy-Tabellennamen abfragt, während die DB modifizierte Bezeichnungen (`sessions`, `user_song_skills`, `user_notes`, `pending_students_decrypted`) führt.

---

## 2. Detaillierte Schadens- & Reparatur-Matrix (360° Inventur)

| Betroffene Tabelle / View | Bounded Context | Ursache des Defekts | Konkrete Auswirkung | Geplante 0,1% Goldstandard-Reparatur |
| :--- | :--- | :--- | :--- | :--- |
| `public.schools` | Master Admin | Migration 352 & 575 nicht angewendet | **Schulanlage bricht ab** (`invite_expires_at` missing); Mahnstufen & Notizen fehlen | Spalten `operator_notes`, `invite_token`, `invite_expires_at`, `phone`, `trial_until`, `is_approved`, `dunning_level`, `dunning_moratorium_until`, `dunning_kulanz_reason`, `dunning_last_letter_at`, `dunning_paused` anlegen + Indizes |
| `public.platform_feedback` | Master Admin & Campus | Migration 284 scheiterte an `REFERENCES users(id)` (View!) | Feedback-Tab im Master-Admin zeigt 0 Items / Insert scheitert | Tabelle mit ENUMs (`feedback_type`, `feedback_status`, `hero_opt_in_type`), Foreign Key auf `users_raw(id)` und RLS erstellen |
| `public.global_broadcasts` | Master Admin | Tabelle im Frontend referenziert, DDL fehlte | Umschalten des Plattform-Wartungsmodus scheitert im ExecutiveTab | Tabelle `global_broadcasts` mit Status, Severity, Type, RLS und Master-Admin-Mutation anlegen |
| `public.band_rehearsals` | GrooveLab | Tabelle im Frontend referenziert, DDL fehlte | Feste Probenzeiten in Bands können nicht geladen/gespeichert werden | Tabelle `band_rehearsals` mit `band_id`, `school_id`, `day`, `time`, RLS anlegen |
| `public.lesson_makeup_tokens` | Campus / Secretary | Migration 407 scheiterte an `REFERENCES users(id)` | Nachhol-Token im Sekretariats-Krisenboard werfen Fehler | Tabelle `lesson_makeup_tokens` mit Foreign Key auf `users_raw(id)` und RLS erstellen |
| `public.student_ranking_profiles` & `student_nickname_history` | Campus Leaderboard | Migration 398 definierte `school_id BIGINT` statt `UUID` | RLS-Operator-Fehler `operator does not exist: bigint = uuid` | Tabelle mit `school_id UUID REFERENCES schools(id)`, Nickname-Validierung und RLS anlegen |
| `public.student_groove_scores` | GrooveLab Trainer | Migration 400 definierte `school_id BIGINT` statt `UUID` | Scores im GrooveTrainer werden nicht persistiert | Tabelle mit `school_id UUID`, Song-Bezug, Accuracy, Streak und RLS anlegen |
| `public.student_ear_scores` | Campus EarLab | Migration 506 definierte `school_id BIGINT` statt `UUID` | Gehörbildungs-Highscores werden nicht gespeichert | Tabelle mit `school_id UUID`, Reaction-Time, Accuracy und RLS anlegen |
| `public.teacher_sandbox_entries` | Campus Lehrkraft | Migration 412 scheiterte an `REFERENCES users(id)` | Lehrer-Sandkasten für Unterrichtsmodule wirft Fehler | Tabelle mit `teacher_id UUID REFERENCES users_raw(id)` und RLS anlegen |
| `public.student_worldtour_progress` | Campus Gamification | Migration 467 scheiterte an `REFERENCES users(id)` | Weltreise-Sterne und XP werden nicht gespeichert | Tabelle mit `user_id UUID REFERENCES users_raw(id)`, UNIQUE Constraint und RLS anlegen |
| `public.audio_recordings` & `audio_milestones` | Campus Audio | Migration 273 definierte `tenant_id BIGINT` statt `UUID` | Audio-Aufnahmen & Meilensteine können nicht zugeordnet werden | Tabellen mit `school_id UUID REFERENCES schools(id)`, Storage-Path und RLS anlegen |
| `public.school_year_playlists` | Campus Audio | Migration 273 definierte `tenant_id BIGINT` | Schuljahres-Playlists fehlen | Tabelle mit `school_id UUID` und RLS anlegen |
| `public.users_raw` & `public.students` | Core Auth & Profile | Spalten aus Migration 382 & 383 fehlten in DB | PWA-Push, Onboarding-Consent und Skill-Radar unvollständig | Spalten `campus_usage_mode`, `consent_version`, `parent_name`, `parental_consent_given_at`, `parent_pin_hash`, `personal_pin_hash`, `skill_radar_levels`, `timetable_source` anlegen |
| `public.pending_students` | Legacy / Roster | Frontend fragt an 5 Stellen `pending_students` ab | Ungültige Tabellenabfrage | Kompatibilitäts-View `pending_students` auf `pending_students_decrypted` anlegen |
| `public.presence_sessions` | Admin Roster Detail | Frontend fragt `presence_sessions` ab | Export und Session-Liste in Modal leer | Kompatibilitäts-View `presence_sessions` auf `public.sessions` anlegen |
| `public.user_skills` | Lehrkraft Detail | Frontend fragt `user_skills` ab | Skill-Radar in TeacherStudentDetailModal leer | Kompatibilitäts-View `user_skills` auf `public.user_song_skills` anlegen |
| `public.student_teachers` | Avatar Relational | Frontend sucht `student_teachers` Junction | Fach-Ermittlung im Avatar schlägt auf Fallback zurück | Kompatibilitäts-View `student_teachers` auf `public.schedules` anlegen |
| `public.student_notes` | DSGVO Takeout | DSGVO-Export fragt `student_notes` ab | Fehlermeldung bei Datenexport | Kompatibilitäts-View `student_notes` auf `public.user_notes` anlegen |
| `public.shouts` | GrooveLab Shoutbox | Schul-Löschung bereinigt `shouts` | Warnung im Delete-Log | Kompatibilitäts-View `shouts` auf `public.band_shoutbox` (mit `school_id` via JOIN) anlegen |
| `public.school_billing_accounts` | Billing Cleanup | Löschroutine bereinigt Restbestände | Warnung im Delete-Log | Basistabelle `school_billing_accounts` mit `school_id UUID` anlegen |
| RPC `get_master_schools_overview` | Master Admin | Return Type Konflikt zwischen `JSONB` und `TABLE` | Schulleitstand & Billing-Dashboard können nicht konsistent laden | Funktion mit `DROP FUNCTION ... CASCADE` säubern und als JSONB-fähigen autoritativen SSOT-RPC neu installieren |
| PostgREST Schema-Cache | API Gateway | Cache veraltet, neue Spalten nicht bekannt | PostgREST wirft `Could not find column ... in schema cache` | Transaktionales `NOTIFY pgrst, 'reload schema'` nach Migration |

---

## 3. Die 4-Phasen-Architektur der Reparatur

### Phase 1: Vorbereitung & Transaktionsprüfung (Abgeschlossen)
- Vollständiger Dry-Run aller SQL-DDL-Befehle via SSH in einer isolierten PostgreSQL-Transaktion (`BEGIN; ... ROLLBACK;`).
- Verifikation, dass alle Syntaxfehler, Foreign-Key-Kollisionen und Typenkonflikte restlos beseitigt sind (0 Fehler, 0 Warnungen).

### Phase 2: Autoritativer Migrations-Container (Geplant nach Freigabe)
- Erstellung der konsolidierten, 100% idempotenten Reparatur-Migration:
  `supabase/migrations/576_enterprise_repair_all_broken_tables_goldstandard.sql`
- Sichere Hinterlegung aller 10 DDL-Blöcke (Schools, Users/Students, Feedback, Broadcasts, Rehearsals, Makeup-Tokens, Leaderboards, Worldtour, Audio, Kompatibilitäts-Views).
- Integration von `DROP FUNCTION IF EXISTS public.get_master_schools_overview() CASCADE;` und anschließender Neuanlage des RPCs.

### Phase 3: Rollout auf IONOS Live-Cluster (`85.215.73.216`)
- Ausführung der ausstehenden Migrationen (572, 573, 575, 576) via `scripts/apply_pending_migrations.sh`.
- Atomarer PostgREST Schema-Cache Reload (`NOTIFY pgrst, 'reload schema'`).
- Validierung der Integritäts-Matrix (alle 22 Tabellen/Views `EXISTS = true`).

### Phase 4: Forensische Verifikation & Smoke Test
- Verifikation über `python3 scratch/forensic_table_analysis.py`: Bestätigung von **0 fehlenden Tabellen** und **0 fehlenden RPCs**.
- Simulierte Neuanlage einer Schule (Payload mit `invite_expires_at`, `operator_notes`, `phone` etc.) auf der Live-DB via API.
- Abruf von Feedback, Wartungsmodus, Probenzeiten und Leaderboards.

---

## 4. Anti-Regressions-Garantie & Invarianten
- **100% Idempotent:** Alle Statements nutzen `IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE VIEW`. Ein erneutes Ausführen ist jederzeit gefahrlos möglich.
- **Zero Data Loss:** Keine bestehende Tabelle oder Spalte wird gedroppt oder geleert. Bestehende Produktivdaten (Schulen, Benutzer, Rechnungen) bleiben unberührt.
- **Multi-Tenancy Default-Deny:** Alle neu erstellten Tabellen haben `ENABLE ROW LEVEL SECURITY` mit striktem `school_id = get_current_user_school_id()` bzw. Master-Admin-Check.

---

> [!IMPORTANT]
> ## 🛑 ZWINGENDER STOPP-PUNKT: Strikter Genehmigungsvorbehalt (Zero Auto-Execute)
> Gemäß den Projektregeln und der Implementierungsplan-Governance hält der KI-Agent nach Vorlage dieses Plans zwingend an (STOP).
> **Es wurden noch keine Änderungen an der Produktionsdatenbank oder dem Quellcode vorgenommen.**
> 
> Bitte geben Sie den Plan frei (z. B. mit *„Genehmigt“*, *„Freigabe erteilt“* oder *„Plan ausführen“*), um mit Phase 3 (Rollout & Reparatur) zu beginnen.
