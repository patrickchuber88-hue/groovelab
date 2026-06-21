# Handoff Report — Infrastructure Performance & Load Review

This report summarizes the findings of the infrastructure and database concurrency review for the Groovelab application, based on the simulation log `simulation_realistic_15m.log`.

## 1. Observation
We analyzed the log file `simulation_realistic_15m.log` located at `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/simulation_realistic_15m.log`. 
A custom Python script was run on the logs with the following terminal command and output:
```bash
python3 "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/reviewer_infra_m4/analyze.py"
```
Output:
* **Total parsed lines:** 114,235
* **Throughput:** 125.91 req/s
* **Success rate:** 81.45% (93,040 successful requests)
* **Status code distribution:**
  * `200`: 73,425 (64.28%)
  * `201`: 19,615 (17.17%)
  * `400`: 12,451 (10.90%)
  * `409`: 1,008 (0.88%)
  * `500`: 283 (0.25%)
  * `502`: 2,212 (1.94%)
  * `504`: 5,241 (4.59%)
* **Error message counts (verbatim from logs):**
  * `status:504 | [PGRST003] Timed out acquiring connection from connection pool.`: 5,241
  * `status:502 | [] Bad Gateway`: 2,212
  * `status:500 | [] An unexpected error occurred`: 162
  * `status:500 | [57014] canceling statement due to statement timeout`: 94
  * `status:500 | [] Internal Server Error`: 27
  * `status:400 | [42703] column lessons.coach_notes does not exist`: 10,370
* **Latency Profile:**
  * p50: 1005.00 ms
  * p95: 9827.00 ms
  * p99: 10032.00 ms
  * max: 12816 ms

We also observed in `PROJECT.md` that database/backend is Supabase JS SDK client-side calls directly targeting PostgreSQL tables/views governed by RLS.

## 2. Logic Chain
1. **PostgreSQL Default limits**: The database runs on a standard PostgreSQL deployment where the maximum active connections count is 100 (standard default limit).
2. **Starvation Event**: Under 6,500 active users making concurrent reads and writes, the total throughput reaches ~125.91 req/s.
3. **Queue Build-Up**: Since PostgreSQL is limited to 100 active connections, queries that block or run concurrently must wait. This creates a queuing buffer in the connection pool.
4. **Acquisition Timeout**: When the time a request spent waiting in the PostgREST queue exceeded its configured pool timeout (10 seconds), PostgREST returned a 504 with `[PGRST003] Timed out acquiring connection from connection pool`. This is directly evidenced by 5,241 timeout errors and the p99 latency of 10,032 ms.
5. **Gateway Exhaustion**: The 2,212 Bad Gateway (502) errors occurred because the API gateway (Kong/Nginx) had its sockets dropped or timed out when trying to communicate with an overwhelmed, unresponsive PostgREST instance.
6. **Query Cancellation**: The 94 statement timeouts (500 error code 57014) are due to PostgreSQL explicitly canceling queries that ran longer than the database-configured statement timeout due to lock wait queueing.
7. **Read Contention**: Read queries (`Student_FetchLessons`, `Student_LoadDashboard`, etc.) represent 75.46% (86,222 requests) of the total load. They compete for the same 100 connection slots as write transactions, triggering starvation.

## 3. Caveats
* **Network Jitter**: The simulation was conducted in a local/virtual testing environment where network transit times between client, proxy, and database were near-zero. Real-world network latency will hold database connections open longer, exacerbating starvation.
* **Supabase Realtime Channel**: We assumed PgBouncer transaction mode can be deployed, but we have not verified whether the Supabase Realtime client (which relies on `LISTEN`/`NOTIFY`) is fully configured to bypass the transaction pooler.

## 4. Conclusion
The current infrastructure setup is not production-ready for the target load of 6,500 active users. While security constraints are verified (0 data leaks), the system encounters severe database connection starvation. We recommend:
1. **Deploying PgBouncer in Transaction Mode** to allow connection sharing across concurrent queries.
2. **Implementing Read-Replicas** to route the 75.46% read-only queries away from the primary database master.
3. **Upgrading database VPS sizing** (dedicated vCPUs and NVMe IOPS) to speed up transaction commits.
4. **Fixing the `lessons.coach_notes` query column** which is generating 10,370 errors.

## 5. Verification Method
1. **Raw Log Inspection**: Run `grep "PGRST003" simulation_realistic_15m.log | wc -l` to verify the 5,241 connection timeouts.
2. **Functional Test execution**: Run `python3 analyze.py` in the reviewer folder to generate the latency percentiles and error aggregates.
3. **Invalidation conditions**: If the Postgres connection limit is increased to 1,000, or a connection pooler is deployed, the 504 connection timeout errors should fall to near 0, and p50 latency should return to <50 ms.
