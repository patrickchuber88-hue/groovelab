# BRIEFING — 2026-07-15T18:42:00Z

## Mission
Locate and analyze legal documents, focus timer tolerance logic, iCal student pseudonymization, server locations, and rate-limiting configs in the codebase.

## 🔒 My Identity
- Archetype: Discovery Explorer (teamwork_preview_explorer)
- Roles: teamwork_preview_explorer, Read-only Investigator
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m1_legal_discovery
- Original parent: 31eb688c-9466-4357-b0dd-7bb0ceff5ed7
- Milestone: m1_legal_discovery

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Inspect codebase and document findings in handoff.md

## Current Parent
- Conversation ID: 31eb688c-9466-4357-b0dd-7bb0ceff5ed7
- Updated: 2026-07-15T18:42:00Z

## Investigation State
- **Explored paths**:
  - `apps/groovelab/src/components/LandingPage.tsx` (legal texts)
  - `apps/groovelab/src/App.tsx` (impressum modal, legal texts)
  - `apps/groovelab/src/components/LoginScreen.tsx` (impressum modal, legal texts)
  - `apps/groovelab/src/components/SecretaryDashboard.tsx` (legal texts)
  - `apps/groovelab/src/components/StudentAvatarDashboard.tsx` (focus timer grace period logic)
  - `apps/groovelab/src/components/QRLandingPage.tsx` (focus timer grace period logic)
  - `supabase/functions/ical-feed/index.ts` (iCal pseudonymization logic)
  - `supabase/migrations/130_anonymized_onboarding.sql` (onboarding rate limit)
  - `supabase/migrations/218_security_privacy_hardening.sql` (pin verification rate limit)
  - `nginx.conf` & `docs/architecture_analysis.md` (server location / network setup)
- **Key findings**:
  - **Timer Discrepancy**: Focus timer has a hardcoded 10-second grace period (`StudentAvatarDashboard.tsx`). The legal descriptions in `App.tsx` and `SecretaryDashboard.tsx` state 15 seconds, while `LandingPage.tsx` and `LoginScreen.tsx` state 10 seconds.
  - **iCal Discrepancy**: iCal feed formats student names as `Firstname L.` (e.g. `Jonas M.`). The legal texts state that student names are pseudonymized as initials (e.g. `J. M. Musikschule`).
  - **Server Location**: Consistently hosted on Hetzner VPS in Germany (Falkenstein/Sachsen).
  - **Rate Limiting**: Custom database-level rate limiting exists for onboarding (`verify_onboarding` RPC) and pin verification (`verify_photo_upload_pin` RPC).
- **Unexplored areas**: None.

## Key Decisions Made
- Initiated the discovery phase for Milestone 1.
- Analyzed the codebase and identified discrepancies between legal declarations and functional implementations.

## Artifact Index
- /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_explorer_m1_legal_discovery/handoff.md — Investigation report and recommendations.
