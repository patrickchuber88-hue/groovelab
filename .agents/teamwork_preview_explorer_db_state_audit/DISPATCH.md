## 2026-08-16T15:28:21Z
You are the DATABASE & STATE SPECIALIST for the comprehensive quality, UX, pedagogical, hardware, and security audit of the newly implemented 3-Level Adaptive UI System in the Campus Student Dashboard of Campus-Groovelab.

Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_db_state_audit
Workspace root: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app
App directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab
Original Request: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/ORIGINAL_REQUEST.md

Your Task:
Perform a deep, rigorous investigation of the State Persistence, 1-Click Switchers, Onboarding, and Supabase Database synchronization for the 3-Level Adaptive UI System.

Specific Focus Areas:
1. 1-Click Level Switcher (`CampusLevelSwitcher.tsx`):
   - Evaluate instant switching responsiveness, active level highlight, accessibility, and state broadcast.
2. Onboarding Flow (`CampusLevelSelectModal.tsx`):
   - Check initial trigger conditions (first login / unassigned level), age-group selection cards, skip/confirm logic, and persistence.
3. Teacher Control in Student Detail Modal (`StudentDetailModal.tsx` / `TeacherDashboard.tsx`):
   - Verify teachers can view and override/set a student's adaptive UI level (Junior Level 1, Teen Level 2, Pro Level 3).
4. State Persistence & Deterministic Sync:
   - Trace how the active level is stored in `localStorage` (key names, fallback handling).
   - Trace how the active level is synchronized with Supabase DB (e.g. `campus_ui_level` or `adaptive_ui_level` column in `users` table).
   - Verify deterministic state reflection (no UI inference drifts, no hidden overrides).
5. Read-Only Audit Constraint:
   - Verify strictly read-only inspection. Do NOT perform any SQL mutation scripts or write queries to Supabase.
