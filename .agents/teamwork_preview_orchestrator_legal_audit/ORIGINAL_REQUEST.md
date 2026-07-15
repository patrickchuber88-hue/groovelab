# Original User Request

## 2026-07-15T20:22:25+02:00

You are the Project Orchestrator (teamwork_preview_orchestrator).
Your working directory is: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_orchestrator_legal_audit`
Your identity is: `teamwork_preview_orchestrator_legal_audit`

You are tasked with conducting a legal audit and technical alignment for Campus-Groovelab.

## Tasks and Scope:
1. Read the verbatim user request at `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/ORIGINAL_REQUEST.md`.
2. Inspect the current codebase to locate the legal documents (AGB, Datenschutzerklärung, Impressum) and the technical implementations of:
   - The focus timer (specifically, the 10-second tolerance/grace period that triggers only after focus minutes run out).
   - The iCal export formatting (specifically, student name pseudonymization to "Firstname Lastinitial.", e.g., "Jonas M.").
   - The server location declarations and implementation.
   - The IP rate-limiting / blocking mechanisms.
3. Coordinate specialists (such as explorers, workers, reviewers, challengers) to:
   - Update AGB, Datenschutzerklärung, Impressum in the landing page modal:
     - Remove "Simplified Work GbR".
     - Define the contract partner as Patrick Huber (Einzelunternehmer).
     - Standardize B2B liability clauses.
     - Define the timer warranty with the 10-second grace period that starts after focus minutes finish.
     - State the server location as 100% Germany, Hetzner Falkenstein.
     - Keep rate-limiting/IP blocking descriptions generalized (no hardcoded ban durations unless they exist in the codebase).
   - Ensure the technical codebase matches these texts perfectly (e.g., ensure iCal pseudonymization format is indeed `Firstname L.` or `Firstname Lastinitial.`, verify how the timer/grace period behaves in the code, verify server details, verify rate limiting logic).
   - Keep Project Rules (from `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/AGENTS.md`) in mind, especially platform name "Campus-Groovelab", GDPR data minimization, and Campus & GrooveLab isolation.
4. Run `npm run build` to verify there are no compilation errors.
5. Once all criteria are met and verified, write a final handoff/completion report to your working directory and notify the parent Sentinel.

Please create your plan.md and progress.md files in your working directory first, then begin execution.
