# Handoff Report — Legal & Code Discovery

This handoff report summarizes the discovery phase for legal documents, the focus timer grace period, iCal export formatting, server location configurations, and IP rate-limiting mechanisms across the codebase.

## 1. Observation

### Legal Documents in Landing Page and Modals
- **Landing Page Modal**: `apps/groovelab/src/components/LandingPage.tsx` lines 1698–1800 contains the inline legal texts for AGB (`activeDocument === 'terms'`), Datenschutzerklärung (`activeDocument === 'privacy'`), and Impressum (fallback):
  - Line 1708: `"Die Bereitstellung der grundlegenden Softwarelizenz für Campus-Groovelab ist dauerhaft 100% kostenlos."`
  - Line 1742: `"Erst nach Erreichen der Fokus-Minuten (in der Verlängerungszeit) gewährt das System eine 10-sekündige Toleranzzeit (Grace Period) bei Lageveränderungen."`
  - Line 1757: `"Der Serverstandort liegt zu 100% in Deutschland (Falkenstein/Sachsen)."`
- **App Impressum Modal**: `apps/groovelab/src/App.tsx` lines 12783–12895 contains the Impressum modal.
  - Line 12716: `"Um die Privatsphäre minderjähriger Schüler bei der Übertragung von iCal-Links über unverschlüsselte Kalender-Protokolle zu sichern, werden Schülernamen im exportierten Kalendertext automatisch pseudonymisiert (z. B. „J. M. Musikschule“ statt „Jonas Müller“)."`
  - Line 12737: `"Zur Vermeidung von Frustration und Drucksituationen für Kinder gewährt das System eine 15-sekündige Toleranzzeit (Grace Period) bei Lageveränderungen."`
- **Login Screen Legal Modals**: `apps/groovelab/src/components/LoginScreen.tsx` lines 6135–6240 contains an Impressum modal and lines 5842 and 5863 contain legal clauses:
  - Line 5842: `"automatisch pseudonymisiert (z. B. „J. M. Musikschule“ statt „Jonas Müller“)."`
  - Line 5863: `"gewährt das System eine 10-sekündige Toleranzzeit (Grace Period) bei Lageveränderungen."`
- **Admin Dashboard Default Impressum**: `apps/groovelab/src/components/AdminDashboard.tsx` lines 28–41 defines `DEFAULT_IMPRESSUM`:
  - Line 28: `const DEFAULT_IMPRESSUM = \`Angaben gemäß § 5 TMG / Patrick Huber / Karl-Fürstenberg Str. 59 / 79618 Rheinfelden\``
- **Secretary Dashboard Legal Modals**: `apps/groovelab/src/components/SecretaryDashboard.tsx` lines 27148 and 27169:
  - Line 27148: `"pseudonymisiert (z. B. „J. M. Musikschule“)"`
  - Line 27169: `"gewährt das System eine 15-sekündige Toleranzzeit (Grace Period) bei Lageveränderungen."`

### Focus Timer Implementation & Grace Period
- **Student Dashboard**: `apps/groovelab/src/components/StudentAvatarDashboard.tsx` lines 4526–4720 contains the `useEffect` representing the focus timer.
  - Line 3508: `const [graceSecondsLeft, setGraceSecondsLeft] = useState(10);`
  - Line 4663–4697:
    ```typescript
    if (!isExtraTimeRef.current) {
      // During the focus minutes: HARD RESET TO 0 IMMEDIATELY on interruption (no grace period)
      setSecondsElapsed(0);
      setIsExtraTime(false);
      setIsGraceActive(false);
      setSessionActive(false);
      playBeep(330, 600); // Fail tone
      if (navigator.vibrate) {
        navigator.vibrate([400, 100, 400]);
      }
    } else {
      // Once the focus minutes are reached: START FRIENDLY COUNTDOWN
      setIsGraceActive(true);
      
      setGraceSecondsLeft(prevGrace => {
        if (prevGrace <= 1) {
          // Grace period expired! Just pause the session. Do NOT reset to 0.
          setSessionActive(false);
          setIsGraceActive(false);
          playBeep(440, 300); // Friendly end tone
          return 10;
        }
        
        // Still in grace period, play warning tone once per interruption
        if (!graceWarningPlayed) {
          playBeep(660, 200); // Warning tone
          if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
          }
          graceWarningPlayed = true;
        }
        
        return prevGrace - 1;
      });
    }
    ```
- **QR Landing Page Dashboard**: `apps/groovelab/src/components/QRLandingPage.tsx` lines 420–480 contains an identical focus timer implementation using `setElapsedSeconds(0)` and a 10-second `graceSecondsLeft` countdown.

### iCal Export Formatting and Pseudonymization
- **Deno Edge Function**: `supabase/functions/ical-feed/index.ts` handles feed generation:
  - Lines 21–31: Defines a `getInitials` helper:
    ```typescript
    const getInitials = (firstName: string, lastName: string): string => {
      const getPartInitials = (nameStr: string) => {
        if (!nameStr) return '';
        return nameStr.trim().split(/\s+/).map(part => {
          return part.split('-').map(subPart => subPart ? subPart[0].toUpperCase() + '.' : '').join('-');
        }).join(' ');
      };
      const firstInit = getPartInitials(firstName);
      const lastInit = getPartInitials(lastName);
      return [firstInit, lastInit].filter(Boolean).join(' ');
    }
    ```
  - Lines 587–591: Formats student names for calendar events:
    ```typescript
    // Privacy-safe student name: Vorname + Initiale des Nachnamens
    const studentFirstName = occ.student?.first_name || 'Schüler'
    const studentLastName = occ.student?.last_name || ''
    const studentInitial = studentLastName ? ` ${studentLastName[0].toUpperCase()}.` : ''
    const studentName = `${studentFirstName}${studentInitial}`
    ```
    This formats names to `Firstname L.` (e.g. `Jonas M.`). The `getInitials` helper is not called.

### Server Location Configuration
- **Environment config**: `.env.local` contains `VITE_SUPABASE_URL=https://supabase.campus-groovelab.de`
- **Frontend Nginx Config**: `nginx.conf` sets up reverse-proxying and SPA routing.
- **Architecture Documentation**: `docs/architecture_analysis.md` lines 11 and 109 state:
  - Statics are served from Hetzner VPS (`178.105.10.2`).
  - Database/Backend is a self-hosted Supabase server on Hetzner VPS in Germany (Falkenstein/Sachsen).

### IP Rate-Limiting and Blocking Mechanisms
- **Onboarding Attempts Limiter**: `supabase/migrations/130_anonymized_onboarding.sql` lines 42–47 and 130–175:
  - IP-based rate limiting is implemented via `public.onboarding_attempts` table.
  - The `public.verify_onboarding` function blocks attempts if more than 3 failed attempts occur in 15 minutes:
    ```sql
    DELETE FROM public.onboarding_attempts WHERE attempted_at < NOW() - INTERVAL '15 minutes';
    SELECT COUNT(*)::INT INTO recent_attempts FROM public.onboarding_attempts WHERE ip_address = client_ip;
    IF recent_attempts >= 3 THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Zu viele Fehlversuche. Bitte versuche es in 15 Minuten erneut.';
        RETURN;
    END IF;
    ```
- **PIN Verification Attempts Limiter**: `supabase/migrations/218_security_privacy_hardening.sql` lines 14–82:
  - Implements user-based rate-limiting in `public.verify_photo_upload_pin` using table `public.pin_verification_attempts`.
  - Blocks requests after 3 failed PIN checks for a student ID in 15 minutes.

---

## 2. Logic Chain

1. **Focus Timer Grace Period Duration**:
   - The legal text in `App.tsx` (line 12737) and `SecretaryDashboard.tsx` (line 27169) lists a **15-second** grace period.
   - The legal text in `LandingPage.tsx` (line 1742) and `LoginScreen.tsx` (line 5863, 6016) lists a **10-second** grace period.
   - The code (`StudentAvatarDashboard.tsx` line 3508, `QRLandingPage.tsx` line 182) hardcodes `10` seconds (`graceSecondsLeft` set to `10`).
   - *Therefore*, there is a discrepancy between the 15-second statements and the 10-second statements and implementation.

2. **iCal Pseudonymization Mismatch**:
   - The legal texts (`App.tsx` line 12716, `LoginScreen.tsx` line 5842, `SecretaryDashboard.tsx` line 27148) declare that names are anonymized as initials (e.g. `J. M. Musikschule` instead of `Jonas Müller`).
   - The `ical-feed` edge function (`supabase/functions/ical-feed/index.ts` lines 587–592) actually formats student names as `Firstname Lastinitial.` (e.g. `Jonas M.`).
   - *Therefore*, the legal text states that initials are used, whereas the code uses "Firstname + Lastinitial.". The `getInitials` helper (which outputs `J. M.`) goes unused.

3. **Server Location Alignment**:
   - The legal texts state that hosting is 100% in Germany (Hetzner Falkenstein/Sachsen), which aligns with the physical server architecture mapped out in `docs/architecture_analysis.md`.

4. **IP Rate-Limiting Scope**:
   - There is no IP-based rate limiting on the Nginx or application layers.
   - Database-level rate limiting exists exclusively in PostgreSQL RPC functions (`verify_onboarding` and `verify_photo_upload_pin`) tracking attempts inside custom relational tables (`onboarding_attempts` and `pin_verification_attempts`).

---

## 3. Caveats

- We did not log in to the remote Hetzner VPS to inspect system-level configurations (e.g. UFW firewall, Fail2Ban rules, or PostgreSQL daemon configuration), nor did we run any network simulation tools.
- We assumed that Deno Deploy or edge function configs (like environment secrets on Supabase Dashboard) match the `.env.local` settings on the self-hosted instance.

---

## 4. Conclusion

- **Timer Discrepancy**: The codebase uses a 10-second grace period for the focus timer, which is correctly stated in `LandingPage.tsx` and `LoginScreen.tsx`, but incorrectly listed as 15 seconds in `App.tsx` and `SecretaryDashboard.tsx`.
- **iCal Name Discrepancy**: The codebase exports student names as `Firstname L.` (e.g. `Jonas M.`), but the legal text describes it as `J. M.` initials.
- **Server and Rate Limiting**: The server location is correctly and consistently declared as Hetzner Online GmbH (Falkenstein/Sachsen, Germany). Rate limiting is implemented inside custom database-level tables for onboarding and PIN verification.

### Recommendations for the Implementer

1. **Align Focus Timer Grace Period Texts**:
   - Update `App.tsx` (line 12737) and `SecretaryDashboard.tsx` (line 27169) to replace `"15-sekündige Toleranzzeit"` with `"10-sekündige Toleranzzeit"` to align with the actual 10-second implementation in `StudentAvatarDashboard.tsx` and `QRLandingPage.tsx`.

2. **Align iCal Pseudonymization Texts**:
   - Update `App.tsx` (line 12716), `LoginScreen.tsx` (line 5842), and `SecretaryDashboard.tsx` (line 27148) to change `"z. B. „J. M. Musikschule“"` to `"z. B. „Jonas M.“"`. This preserves readability and correctly describes the name format implemented in the edge function.

---

## 5. Verification Method

- **To verify the discrepancies**:
  - View `apps/groovelab/src/App.tsx` line 12737 and line 12716.
  - View `apps/groovelab/src/components/SecretaryDashboard.tsx` line 27169 and line 27148.
  - View `apps/groovelab/src/components/LoginScreen.tsx` line 5863 and line 5842.
  - View `supabase/functions/ical-feed/index.ts` lines 587–591 to see that it builds `studentName` as `${studentFirstName}${studentInitial}` where `studentInitial` is ` ${studentLastName[0].toUpperCase()}.`.
