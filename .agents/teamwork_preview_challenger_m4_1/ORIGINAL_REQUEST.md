## 2026-06-28T20:39:16Z

Perform functional check on the routing paths:
1. Verify if accessing `/` when unauthenticated renders the `LandingPage`.
2. Verify if accessing `/login` when unauthenticated renders `LoginScreen`.
3. Verify if accessing `/signup` when unauthenticated renders `SignupWizard`.
4. Verify if accessing `/dashboard` when unauthenticated redirects to `/`.
5. Verify if accessing `/` or `/login` or `/signup` when authenticated redirects to `/dashboard`.
Write a script or write validation tests inside your folder to verify these redirections, run it, and output the logs to your handoff.md.
