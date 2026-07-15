# BRIEFING — 2026-07-15T18:25:00Z

## Mission
Align legal texts and technical implementations regarding contract partner, liability clauses, timer warranty, server location, rate-limiting, and iCal pseudonymization.

## 🔒 My Identity
- Archetype: Worker
- Roles: implementer, qa, specialist
- Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2_legal_implementation
- Original parent: 31eb688c-9466-4357-b0dd-7bb0ceff5ed7
- Milestone: Legal & Technical Alignments

## 🔒 Key Constraints
- Remove "Simplified Work GbR" everywhere in the codebase (including fallback values and database default/seeded migrations) and define contract partner as "Patrick Huber (Einzelunternehmer)" or "Patrick Huber".
- Standardize B2B liability clauses in the landing page modal AGB (§ 4) to match the standard B2B liability clauses in `App.tsx` and `SecretaryDashboard.tsx` § 5.2.
- Define the timer warranty with the 10-second grace period that starts after focus minutes finish (in the extension/Verlängerungszeit) across all legal documents (e.g. § 5 in `App.tsx`, `SecretaryDashboard.tsx`, `LoginScreen.tsx`, and `LandingPage.tsx`).
- State the server location as 100% Germany, Hetzner Falkenstein.
- Keep rate-limiting/IP blocking descriptions generalized (remove 1-hour ban and 5 attempts/min details).
- In all files describing iCal pseudonymization, update the example from "J. M. Musikschule" to "Jonas M.".
- Do not cheat, no dummy implementations.

## Current Parent
- Conversation ID: 31eb688c-9466-4357-b0dd-7bb0ceff5ed7
- Updated: not yet

## Task Summary
- **What to build**: Legal text updates and technical alignment modifications across multiple components and migration files.
- **Success criteria**: Legal documents are updated, build passes, all constraints are satisfied.
- **Interface contracts**: Codebase file structure.
- **Code layout**: Standard React (Vite/TS) project structure.

## Key Decisions Made
- [TBD]

## Artifact Index
- `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2_legal_implementation/progress.md` — Progress tracking file

## Change Tracker
- **Files modified**: None yet
- **Build status**: Unknown
- **Pending issues**: None

## Quality Status
- **Build/test result**: Unknown
- **Lint status**: Unknown
- **Tests added/modified**: None

## Loaded Skills
- None
