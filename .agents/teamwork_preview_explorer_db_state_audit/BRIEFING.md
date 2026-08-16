# BRIEFING — 2026-08-16T15:31:15Z

## Mission
Audit State Persistence, 1-Click Switcher, Onboarding Modal, Teacher Override, and Supabase Database Sync for the Campus 3-Level Adaptive UI System.

## 🔒 My Identity
- Archetype: explorer
- Roles: Database & State Specialist
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_db_state_audit
- Original parent: 5158d4be-71de-416b-aee0-51771b2fad1f
- Milestone: 3-Level Adaptive UI System Audit

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Do NOT perform any SQL mutation scripts or write queries to Supabase
- Follow all Campus-Groovelab rules and naming conventions

## Current Parent
- Conversation ID: 5158d4be-71de-416b-aee0-51771b2fad1f
- Updated: 2026-08-16T15:31:15Z

## Investigation State
- **Explored paths**:
  - `apps/groovelab/src/components/campus/CampusLevelSwitcher.tsx`
  - `apps/groovelab/src/components/campus/CampusLevelSelectModal.tsx`
  - `apps/groovelab/src/components/campus/CampusJuniorDashboard.tsx`
  - `apps/groovelab/src/components/campus/CampusTeenDashboard.tsx`
  - `apps/groovelab/src/components/StudentAvatarDashboard.tsx`
  - `apps/groovelab/src/components/StudentDetailModal.tsx`
  - `apps/groovelab/src/components/TeacherDashboard.tsx`
  - `apps/groovelab/src/types/database.ts`
  - `supabase/migrations/271_fix_users_view_and_onboarding_pin.sql`
  - `supabase/migrations/60_detox_wrapped_matrix.sql`
  - `supabase/migrations/52_campus_erp_integration.sql`
- **Key findings**:
  - 1-Click switcher and onboarding modal are fully implemented and visually responsive with color coding.
  - Teacher controls in `StudentDetailModal.tsx` are fully designed with 3 age buttons (`🐣 6–10 J.`, `🚀 11–15 J.`, `👑 16+ J.`).
  - **Database schema gap**: `campus_ui_level` column is missing from PostgreSQL `users_raw` table, `public.users` view, and `handle_users_view_dml()` trigger in migration scripts. Updates are swallowed in try-catch blocks and persist only locally in `localStorage`.
  - **Device isolation edge case**: `localStorage` key `'campus_student_ui_level'` is un-namespaced across siblings on shared devices.
  - **Junior/Teen practice session logging discrepancy**: In `handleJuniorPracticeComplete`, `fokus_logs` insert uses `student_id` (table requires `user_id`) and `avatars` update uses `.eq('student_id', ...)` (table requires `.eq('user_id', ...)`).
- **Unexplored areas**: None for DB & State scope.

## Key Decisions Made
- Completed read-only analysis without executing database mutations. Producing comprehensive 5-component handoff report.

## Artifact Index
- DISPATCH.md — Dispatch log
- BRIEFING.md — Situational awareness
- progress.md — Liveness & progress tracking
- handoff.md — Final 5-component audit report
