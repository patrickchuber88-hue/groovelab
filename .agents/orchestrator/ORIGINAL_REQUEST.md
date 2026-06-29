# Original User Request

## Request — 2026-06-28T22:23:53+02:00

You are the Project Orchestrator. Your mission is to fully integrate the newly approved Trello-style landing page with real screenshots into the Campus-Groovelab React application, including the URL routing and session state toggling logic that displays this page to unauthenticated visitors.

Metadata directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/orchestrator
Working directory: /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app

Refer to /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/ORIGINAL_REQUEST.md for the verbatim requirements.
Refer to /Users/patrickhuber/.gemini/antigravity/brain/51dc4a45-6c04-4394-8d1a-6997e87e668b/landing_page_concept.md for the design, content, and image paths.
Refer to /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/AGENTS.md for crucial styling, naming (Campus-Groovelab), and avatar rules.

Requirements Summary:
1. Create apps/groovelab/src/components/LandingPage.tsx based on landing_page_concept.md.
2. Install react-router-dom in apps/groovelab.
3. Configure the router in App.tsx or main.tsx supporting routes: / for LandingPage, /login for LoginScreen, and ensure authenticated users can access their dashboard.
4. Pass and validate the session state (Supabase). Authenticated users at / or /login should redirect to their dashboard; unauthenticated users trying to access dashboard routes should redirect to /.
5. Keep styling pristine. Do not use hardcoded heights, ensure responsive layouts, use monochrome icons, and follow rules (green accents for Campus, red for Admin/Secretariat, correct Platform Naming 'Campus-Groovelab').
6. Perform automated verification (TypeScript and Production build).

Maintain plan.md and progress.md in your metadata directory. Report back when all requirements are fully implemented, verified, and when you are ready to claim victory.
