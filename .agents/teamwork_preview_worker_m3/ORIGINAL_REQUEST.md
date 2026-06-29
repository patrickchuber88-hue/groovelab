## 2026-06-28T20:33:52Z
You are teamwork_preview_worker. Your working directory is /Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/teamwork_preview_worker_m3.

Your goal is to configure routing using `react-router-dom` in the application entrypoint, replacing manual URL manipulation and state view toggling.

STEPS TO EXECUTE:
1. Update `apps/groovelab/src/main.tsx` to wrap `<App />` inside `<BrowserRouter>` from `react-router-dom`:
   ```typescript
   import { BrowserRouter } from 'react-router-dom';
   // Wrap App component:
   <BrowserRouter>
     <App />
   </BrowserRouter>
   ```
2. Update `apps/groovelab/src/App.tsx`:
   - Import `useLocation`, `useNavigate`, `useSearchParams` from `'react-router-dom'`.
   - In the `App` component body, retrieve hooks:
     ```typescript
     const location = useLocation();
     const navigate = useNavigate();
     const [searchParams] = useSearchParams();
     ```
   - Convert `isSignup` state to a derived value:
     ```typescript
     const isSignup = location.pathname === '/signup';
     ```
     Remove the `isSignup` useState hook and its associated `handlePopState` popstate event listener `useEffect` entirely.
   - Convert `currentView` to a derived value based on pathname:
     ```typescript
     const currentView = (location.pathname === '/login' || location.pathname === '/signup')
       ? 'login'
       : (location.pathname === '/' ? 'landing' : 'dashboard');
     ```
     Remove the `currentView` useState hook.
   - Replace any state update calls to `setIsSignup(...)` or `setCurrentView(...)` with standard navigation calls:
     - `onBackToLogin` inside `SignupWizard` -> `navigate('/login')` or `navigate('/')`
     - `onSignupSuccess` inside `SignupWizard` -> `setLoggedInUserId(uid); navigate('/dashboard');`
     - `onLogin` inside `LandingPage` -> `navigate('/login')`
     - `onRegister` inside `LandingPage` -> `navigate('/signup')`
     - Other visibility-toggle calls (e.g. `setCurrentView(...)`) -> navigate to target path.
   - Replace manual `window.location.pathname` check for `qrPathMatch` with:
     ```typescript
     const qrPathMatch = location.pathname.match(/^\/qr\/([^/?#]+)/);
     ```
   - Replace search parameter parses `new URLSearchParams(window.location.search)` with the react-router-dom search hook or standard search params if simpler.
   - Add a `useEffect` hook to handle redirect routing and state synchronization:
     ```typescript
     useEffect(() => {
       if (loading) return; // wait until supabase auth/session loading is complete
       
       const isAuth = !!loggedInUserId;
       const isPublicRoute = 
         location.pathname === '/' || 
         location.pathname === '/login' || 
         location.pathname === '/signup' || 
         location.pathname.startsWith('/qr/');
         
       if (isAuth) {
         // Redirect logged-in users at / or /login or /signup to /dashboard
         if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup') {
           navigate('/dashboard', { replace: true });
         }
       } else {
         // Redirect unauthenticated users trying to access dashboard/protected routes to /
         if (!isPublicRoute) {
           navigate('/', { replace: true });
         }
       }
     }, [loggedInUserId, location.pathname, loading, navigate]);
     ```
   - In the return block of `App` component, make sure:
     - If `location.pathname === '/login'`, render `<LoginScreen ... />`.
     - If `location.pathname === '/'`, render `<LandingPage ... />`.
     - If `location.pathname === '/signup'`, render `<SignupWizard ... />`.
     - If `qrPathMatch` is found, render the `QRLandingPage` check (preserving the standalone check).
     - Ensure the E2E tests still pass and the build succeeds!

STYLING & NAMING CONSTRAINTS:
- Keep branding precisely "Campus-Groovelab".
- Keep license representation "100% kostenlos".

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff.md in your working directory summarizing changes made and verification results.
