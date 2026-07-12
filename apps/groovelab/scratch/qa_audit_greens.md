# Master QA Audit & Green Color Compliance Report

This report presents the consolidated audit findings from the Consistent Agent Audit Team (**UX Designer**, **Database Specialist**, **Security Auditor**, and **Lead QA Engineer**) regarding active files requiring updates and the presence of legacy green colors within the **Campus-Groovelab** codebase.

---

## 1. Legacy Green Color Audit

We performed a comprehensive grep search across all active codebase files (excluding backups and temporary files such as `*.bak`, `*.temp`, and files inside the `/scratch` directories) for the following legacy forest/grass green hex codes:
- `#137333`
- `#34a853`
- `#22c55e`
- `#1e7e34`
- `#0f5b29`

### Verification Findings:
*   **`#22c55e` (Tailwind Green-500)**: **Exists and is active**. It is used extensively for accents, vocals/role indicators, status circles, and checkboxes in the following files:
    - [App.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/App.tsx)
    - [AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx)
    - [BandProfileContent.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/BandProfileContent.tsx)
    - [CampusEventsBoard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/CampusEventsBoard.tsx)
    - [CampusSetupScreen.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/CampusSetupScreen.tsx)
    - [DeviceSetupScreen.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/DeviceSetupScreen.tsx)
    - [LandingPage.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/LandingPage.tsx)
    - [MeisterwerkDocumentationModal.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx)
    - [SecretaryDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/SecretaryDashboard.tsx)
    - [StudentAvatarDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/StudentAvatarDashboard.tsx)
    - [TeacherDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/TeacherDashboard.tsx)
    - [GrooveLabModule.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/groovelab/GrooveLabModule.tsx)
    - [VerwaltungModule.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/verwaltung/VerwaltungModule.tsx)
*   **`#137333`**: **Does NOT exist in active codebase files** (only found in instructions/guidelines, `.bak` and `.temp` backups, and `/scratch` reports).
*   **`#34a853`**: **Does NOT exist in active codebase files** (only found in `.bak` backups).
*   **`#1e7e34`**: **Does NOT exist in the codebase**.
*   **`#0f5b29`**: **Does NOT exist in the codebase**.

---

## 2. Master File-Change List

The audit team identified the following active files that must be updated to comply with UX, styling, data privacy, and schema rules.

### UX Designer Recommendations:
1.  **[QRLandingPage.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/QRLandingPage.tsx)**
    *   *Required Change*: Correct spelling from `"Campus GrooveLab"` to `"Campus-Groovelab"` (hyphenated and lowercase 'l') in the brand footer (approx. line 1963).
2.  **[AdminDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/AdminDashboard.tsx)**
    *   *Required Change*: Ensure the primary color accents for Administration/Secretariat panels do not override to green (`#16a34a`) or yellow (`#eab308`) based on the active tab toggle. Enforce the global admin theme red (`#ea4335`) strictly.
3.  **[App.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/App.tsx)**
    *   *Required Change*: Remove multi-color emojis (e.g., `🎓`, `🔒`, `🚀`) in active tab controls and sidebars, replacing them with monochrome styling or CSS/SVGs in the primary theme color.
4.  **[CampusTeacherDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/CampusTeacherDashboard.tsx)**
    *   *Required Change*: Replace active UI emojis (e.g., `📅`, `📈`, `🔔`) on dashboard cards with monochrome indicators/icons.

### Security Auditor Recommendations:
5.  **[App.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/App.tsx)**
    *   *Required Change*: Refactor avatar display rules (approx. lines 157-161). Musician/instrument avatars are strictly restricted to the `groovelab` module and must not display when `activePlat === 'campus'`.
6.  **[CampusTeacherDashboard.tsx](file:///Users/patrickhuber/Documents/Antigravity%20Projects/Groovelab%20app/apps/groovelab/src/components/CampusTeacherDashboard.tsx)**
    *   *Required Change*: Wrap student names in schedule tooltips, list views, and document headers (approx. lines 2955, 3143, 3204) with the `maskLastName` helper to truncate student last names to `Vorname + Anfangsbuchstabe Nachname` for GDPR compliance.

### Database Specialist Recommendations:
7.  **Test Suite Queries & Load Simulation Scripts**
    *   *Required Change*: Resolve client query schema drift. Update any simulation or testing scripts that query `coach_notes` or `homework` from the `lessons` table (e.g., `simulate_load_realistic_15m.mjs` or similar sandbox queries). Point queries for notes to `users.coach_notes` and homework to `progress_matrix.homework_notes` instead.

---

### Audit Team Sign-Off:
*   **UX Designer** - *Status: Approved* (Pending theme/naming changes)
*   **Database Specialist** - *Status: Approved* (Pending query drift corrections)
*   **Security Auditor** - *Status: Approved* (Pending name masking and avatar adjustments)
*   **Lead QA Engineer** - *Status: Pending Verification* (Will sign off once target file changes are checked)
