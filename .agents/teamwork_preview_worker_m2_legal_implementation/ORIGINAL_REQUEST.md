## 2026-07-15T18:25:06Z
You are the Worker (teamwork_preview_worker).
Your working directory is: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2_legal_implementation.
Please create this directory first.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your task is to implement the following changes in the codebase to align the legal texts and technical implementations:

1. Update B2B and B2C Nutzungsbedingungen/AGB, Datenschutzerklärung, and Impressum:
   - Remove "Simplified Work GbR" everywhere in the codebase (including fallback values and database default/seeded migrations) and define the contract partner as "Patrick Huber (Einzelunternehmer)" or "Patrick Huber".
   - Standardize B2B liability clauses in the landing page modal AGB (§ 4) to match the standard B2B liability clauses in `App.tsx` and `SecretaryDashboard.tsx` § 5.2.
   - Define the timer warranty with the 10-second grace period that starts after focus minutes finish (in the extension/Verlängerungszeit) across all legal documents (e.g. § 5 in `App.tsx`, `SecretaryDashboard.tsx`, `LoginScreen.tsx`, and `LandingPage.tsx`).
   - State the server location as 100% Germany, Hetzner Falkenstein.
   - Keep rate-limiting/IP blocking descriptions generalized (no hardcoded ban durations unless they exist in the codebase, e.g. generalize § 6.3 in AGB to remove 1-hour ban and 5 attempts/min details).
   - In all files describing iCal pseudonymization, update the example from "J. M. Musikschule" to "Jonas M." (since the edge function actually exports "Firstname Lastinitial.").

Files to modify:
- `apps/groovelab/src/components/LandingPage.tsx`
- `apps/groovelab/src/App.tsx`
- `apps/groovelab/src/components/LoginScreen.tsx`
- `apps/groovelab/src/components/SecretaryDashboard.tsx`
- `apps/groovelab/src/components/QRLandingPage.tsx`
- `apps/groovelab/src/components/BillingDashboard.tsx`
- `apps/groovelab/src/components/MasterAdminDashboard.tsx`
- `apps/groovelab/src/components/StudentAvatarDashboard.tsx`
- `supabase/migrations/161_master_billing_settings.sql`
- `scratch/original.tsx` (if relevant)

2. Run `npm run build` (or similar build command) to verify that there are no TypeScript or compilation errors.

Write a detailed handoff report `handoff.md` in your working directory summarizing:
- All modified files.
- The build command run and its output.
- Verification details.

Once done, report back to the parent.
