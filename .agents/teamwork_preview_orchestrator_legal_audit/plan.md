# Legal Audit and Technical Alignment Plan

## Architecture & Scope
Campus-Groovelab is an application requiring legal alignment of documents and technical codebase verification.
This plan tracks the inspection of legal documents and alignment with technical implementations.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Discovery | Locate and analyze legal documents & technical implementations | None | DONE |
| 2 | Implementation | Update legal documents (AGB, Datenschutz, Impressum) & align code | Discovery | DONE |
| 3 | Verification | Run build, tests, and verify overall alignment | Implementation | DONE |
| 4 | Audit & Handoff | Perform Forensic Audit verification and write handoff report | Verification | DONE |

## Detailed Technical Alignment Areas
- **Legal Documents**: Replace "Simplified Work GbR" with "Patrick Huber (Einzelunternehmer)", standardize B2B liability, define timer warranty with 10-second grace period, set server location as Hetzner Falkenstein Germany, and generalize rate-limiting.
- **Focus Timer**: Grace period must trigger only after focus minutes run out (10s tolerance).
- **iCal Export**: Verify that student names are pseudonymized to `Firstname Lastinitial.` (e.g. `Jonas M.`).
- **Server Location**: Verify declaration matches actual location (Germany, Hetzner Falkenstein).
- **IP Rate-Limiting**: Verify logic matches described mechanisms.
