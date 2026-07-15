# Handoff Report — Milestone 5 Legal Alignment & Event Program Planning Board Correction

## 1. Observation
- Modified files:
  - `apps/groovelab/src/components/CampusEventsBoard.tsx` (around line 304):
    `!lesson.status?.startsWith('cancel') && lesson.status !== 'teacher_sick'`
  - `apps/groovelab/src/App.tsx`:
    - Updated contract partner (line 12690): `Patrick Huber (Einzelunternehmer)`
    - Standardized timer grace period (line 12737): `10-sekündige Toleranzzeit (Grace Period), die erst nach Ablauf der Fokus-Minuten in der Verlängerungszeit greift`
    - Stated server location (line 12612): `zu 100% auf Servern in Deutschland (Hetzner Falkenstein)... am Standort Falkenstein betrieben`
    - Generalized rate limiting (line 12745): `Bei zu vielen fehlgeschlagenen Authentifizierungsversuchen...`
    - Updated iCal pseudonymization example (line 12716): `z. B. „Jonas M.“ statt „Jonas Müller“`
  - `apps/groovelab/src/components/LoginScreen.tsx`:
    - Updated contract partner in B2B & B2C AGB (lines 5816, 5981): `Patrick Huber (Einzelunternehmer)`
    - Standardized B2B & B2C timer grace periods (lines 5863, 6016): `10-sekündige Toleranzzeit (Grace Period), die erst nach Ablauf der Fokus-Minuten in der Verlängerungszeit greift`
    - Stated server location in B2B/B2C Datenschutz and AV-Vertrag (lines 844, 6011, 6128): `zu 100% in Deutschland... am Standort Falkenstein`
    - Generalized rate limiting (line 5871): `Bei zu vielen fehlgeschlagenen Authentifizierungsversuchen...`
  - `apps/groovelab/src/components/SecretaryDashboard.tsx`:
    - Updated contract partner (line 27122): `Patrick Huber (Einzelunternehmer)`
    - Standardized B2B timer grace period (line 27169): `10-sekündige Toleranzzeit (Grace Period), die erst nach Ablauf der Fokus-Minuten in der Verlängerungszeit greift`
    - Stated server location (line 27307): `zu 100% auf Servern in Deutschland (Hetzner Falkenstein)... am Standort Falkenstein betrieben`
    - Generalized rate limiting (line 27177): `Bei zu vielen fehlgeschlagenen Authentifizierungsversuchen...`
    - Updated iCal pseudonymization example (line 27148): `z. B. „Jonas M.“ statt „Jonas Müller“`
  - `apps/groovelab/src/components/QRLandingPage.tsx`:
    - Updated contract partner (line 1109): `'Patrick Huber'`
    - Stated server location and generalized rate limiting (line 1096): `zu 100% in Deutschland (Standort Falkenstein/Sachsen)...`
  - `apps/groovelab/src/components/LandingPage.tsx`:
    - Standardized B2B liability clauses in the landing page AGB modal (§ 4, line 1737): Added B2B liability exclusion matching App.tsx/SecretaryDashboard.tsx.
    - Timer warranty: Already defined correctly (§ 5, line 1740).
- Command executed for TypeScript compilation check:
  `npm run build:groovelab` -> Completed successfully with 0 errors.
- Command executed for mock E2E tests:
  `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts` -> 124 of 124 tests passed.
- Command executed for real E2E tests:
  `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts` -> 124 of 124 tests passed.

## 2. Logic Chain
- A lesson status of `'teacher_sick'` denotes that the lesson is cancelled because the teacher is sick.
- In `getConflictsMap` in `apps/groovelab/src/components/CampusEventsBoard.tsx`, conflict checking was excluding cancelled lessons using only `!lesson.status?.startsWith('cancel')`.
- Because `'teacher_sick'` does not start with `'cancel'`, it was incorrectly treated as an active lesson, leading to false positive conflict flags.
- By changing the condition to `!lesson.status?.startsWith('cancel') && lesson.status !== 'teacher_sick'`, any lesson with the status `'teacher_sick'` is successfully excluded from the active lessons conflict check.
- The company name "Simplified Work GbR" was replaced with "Patrick Huber (Einzelunternehmer)" or "Patrick Huber" as contract partner in terms, AGB, state variables, and fallback values to conform to current legal entities.
- B2B liability clauses in the AGB modal of `LandingPage.tsx` was synchronized to standard B2B liability rules found in other modules.
- The Übe-Timer grace period was standardized to 10 seconds starting after focus minutes in the extension period across all legal text references.
- Server location was corrected to "100% Germany, Hetzner Falkenstein" across all terms and privacy documents.
- Rate-limiting descriptions were generalized to avoid exposing specific configurations (e.g. 5 attempts/min, 1-hour block).
- The iCal pseudonymization example was changed from "J. M. Musikschule" to "Jonas M." to match actual export behavior.
- TypeScript compilation and E2E tests (both mock and real modes) run and pass, proving that the changes introduce no regressions or compilation errors.

## 3. Caveats
- No caveats.

## 4. Conclusion
- All legal document alignments and the Milestone 5 event board correction have been successfully implemented and verified. The status `'teacher_sick'` is now correctly excluded from double-booking/conflict checking, and the legal texts are completely aligned.

## 5. Verification Method
- **Verification Commands**:
  - Compiles & Builds: `npm run build:groovelab`
  - Mock E2E tests: `USE_MOCK=true npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
  - Real E2E tests: `USE_MOCK=false npx tsx apps/groovelab/src/tests/run_e2e_tests.ts`
- **Files to inspect**:
  - `apps/groovelab/src/components/CampusEventsBoard.tsx` around line 304.
  - `apps/groovelab/src/App.tsx` around line 12690.
  - `apps/groovelab/src/components/LoginScreen.tsx` around lines 844, 5816, 5981.
  - `apps/groovelab/src/components/SecretaryDashboard.tsx` around line 27122.
  - `apps/groovelab/src/components/QRLandingPage.tsx` around line 1109.
  - `apps/groovelab/src/components/LandingPage.tsx` around line 1737.
