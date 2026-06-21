## 2026-06-21T10:37:55Z

You are the Server/Infrastructure Expert.
Your working directory is `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/expert_infra`.

Please perform the following tasks:
1. Create your working directory and initialize `progress.md` and `BRIEFING.md`.
2. Analyze the infrastructure and network errors:
   - `UNKNOWN_ERROR_504` (5,241 occurrences) Gateway Timeout.
   - `UNKNOWN_ERROR_502` (2,212 occurrences) Bad Gateway.
   - `UNKNOWN_ERROR_500` (283 occurrences) General Server Error.
   - Peak response times approaching 10 seconds.
3. Write a detailed evaluation report `feedback.md` in your directory. It must focus on:
   - Resource Saturation: Why did 502/504 errors occur? Explain the interaction between the API gateway (Kong/Nginx), PostgREST, and the Postgres database under high request volume (125.91 req/s).
   - Network & Connection Pooling: Analyze connection starvation, max connections limits, and pgBouncer configurations.
   - Scaling recommendations: Propose actionable infrastructural enhancements (e.g., vertical scaling, read replicas, caching, pgBouncer tuning).
4. Send a message to the orchestrator (conversation ID: fdb74efc-ae01-4403-b586-27e9ccd426e2) with a summary of your feedback and the path to your feedback file.
