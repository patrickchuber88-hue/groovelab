# Integration Plan - Landing Page & Routing

## Milestones

1. **M1: Exploration & Diagnostics**
   - Locate how authentication state, routing, and screens are structured currently.
   - Verify how static assets are resolved (e.g. `/campus_login_hero.png` and screen assets under `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__...`).
   - Formulate exact changes required for `App.tsx` and dependencies.

2. **M2: Component Creation & Package Installation**
   - Install `react-router-dom` in `apps/groovelab`.
   - Create `apps/groovelab/src/components/LandingPage.tsx` with Trello-style layout, Target platform naming "Campus-Groovelab", free license messaging, target audience boxes (red accent for Secretariat, green accent for Teachers and Students/Parents).
   - Use monochrome icons (e.g., from `lucide-react`) for active features, no hardcoded heights, responsive columns.

3. **M3: Routing & Session Integration**
   - Implement `BrowserRouter`, `Routes`, and `Route` in `App.tsx` (or `main.tsx` if more appropriate).
   - Configure `/` -> `LandingPage`, `/login` -> `LoginScreen`, and ensure authenticated users redirect to dashboard.
   - Protect dashboard views by redirecting unauthenticated users to `/`.

4. **M4: Validation & Quality Gate**
   - Run TypeScript validation: `npx tsc -p apps/groovelab`.
   - Run production build: `npm run build:groovelab`.
   - Verify platform styling constraints (naming, monochrome icons, theme colors).
   - Run Forensic Auditor verification for code integrity.
