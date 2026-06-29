## 2026-06-28T20:27:32Z
You are teamwork_preview_worker. Your working directory is /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m2.

Your goals are:
1. Create directory `apps/groovelab/public/screenshots` if it does not exist.
2. Copy the 4 screenshot files from:
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677535200.png`
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677645630.png`
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677784641.png`
   - `/Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/media__1782677784662.png`
   into `apps/groovelab/public/screenshots/`.
3. Install `react-router-dom` dependency in `apps/groovelab` using `npm install react-router-dom -w apps/groovelab` (or run it inside the `apps/groovelab` directory). Make sure typescript types are also available.
4. Create the new React component `apps/groovelab/src/components/LandingPage.tsx` based on `landing_page_concept.md`.

STYLING & NAMING CONSTRAINTS:
- Refer to the platform as **Campus-Groovelab** in all UI elements, user communications, messages, and document descriptions. Precise spelling is mandatory.
- The software license is always 100% free of charge ("100% kostenlos").
- Primary Theme Colors:
  - In Administration/Secretariat, the primary color accents must be red (e.g. `#ea4335`, `#fce8e6` for backgrounds).
  - In the Campus module, the primary color accents must be green (e.g. `#137333`, `#e6f4ea`/`#d1fae5` for backgrounds).
- Emojis/icons in active UI components must be monochrome/single color. Avoid colored/multi-color graphics/emojis.
- Layout:
  - CSS Grid with `gap: 64px` for sections, flexbox layouts with `flex-wrap: wrap`.
  - No hardcoded heights. Use `height: auto` + padding.

LANDING PAGE DESIGN REQUIREMENTS:
- Header/Sticky navigation: Logo "Campus-Groovelab", Dropdowns (Funktionen, Zielgruppen, Preise), Login ("Anmelden") link, CTA ("Kostenlos registrieren").
- Hero section: H1 "Campus-Groovelab brings deine Musikschule zum Klingen. Einfach organisiert, voll vernetzt.", H2 "Die erste voll integrierte Plattform...", Email Input + "Jetzt kostenlos starten" CTA, schedule board screenshot mockup (`/screenshots/media__1782677535200.png`) with drop-shadow.
- Three Target Audience Columns (Secretariat - red; Teachers - green; Students/Parents - green).
- Interactive USP Detail Tabs: Dynamic state-controlled selector for the 3 USPs, changing description and image on the right.
- DSGVO-Sicherheit section ("Security by Design", Supabase RLS).
- Pricing section ("100% kostenlos" for software license).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff.md in your working directory summarizing changes made and verification results.
