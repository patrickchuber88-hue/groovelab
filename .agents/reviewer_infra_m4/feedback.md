# Infrastructure & Performance Load Test Review
**Timestamp:** 2026-06-21T12:55:00+02:00  
**Simulated Log Analyzed:** `simulation_realistic_15m.log`  
**Active User Load:** 6,500 Simulated Users  
**Working Directory:** `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/.agents/reviewer_infra_m4`

---

## Executive Summary
This report analyzes the performance metrics, connection behaviors, and error profiles from the 15-minute realistic concurrency simulation. Under a load of 6,500 active users generating ~125.91 requests per second, the application encountered database connection pool starvation. While functional security boundaries (such as Row-Level Security) performed correctly with zero unauthorized leaks, the infrastructure layer failed to scale, resulting in a **81.45% success rate** and **21,195 failed requests (18.55%)**. This report identifies connection starvation on PostgreSQL's standard 100-connection limit as the primary root cause and presents a mitigation plan spanning PgBouncer transaction mode pooling, read-replicas, and hardware upgrades.

---

## 1. Throughput & Connection Concurrency Behavior

### Metric Synthesis
* **Total Simulated Duration:** 907.3 seconds (15 minutes + execution drift)
* **Total Requests Dispatched:** 114,235 requests
* **Throughput:** 125.91 req/s
* **Successful Requests:** 93,040 (81.45%)
* **Failed Requests:** 21,195 (18.55%)
* **Latency Profile:**
  * **p50 (Median):** 1,005 ms
  * **p90:** 6,984 ms
  * **p95:** 9,827 ms
  * **p99:** 10,032 ms
  * **Max:** 12,816 ms

### Connection Concurrency Dynamics
The simulation was run with 6,500 simulated active users. In a typical web application setup using direct Supabase/PostgREST connection paths, requests are dispatched concurrently. With PostgreSQL's connection limit capped at the standard 100 connections:
1. **Queuing Accumulation**: At an arrival rate of 125.91 req/s, if queries begin to block or take longer than a few milliseconds (due to write transaction locks or concurrent table scans), the active connections are held.
2. **Deep Queues**: Incoming requests are queued by PostgREST waiting for a connection slot. As the arrival rate exceeds the service rate of the 100 connections, the queue grows exponentially.
3. **Latency Profile Shift**: The p50 latency of 1,005 ms and the clustering of p95/p99 latencies around the 10-second mark are direct results of this queuing. Rather than reflecting actual query execution times, these latencies represent the queue wait time of the requests before they can acquire a connection.

---

## 2. Server Error Code & Root Cause Analysis

We identified three critical server-side infrastructure errors in the log file, totaling 7,736 infrastructural failures:

### A. `UNKNOWN_ERROR_504` (5,241 occurrences)
* **Error Message in Log:** `status:504 | [PGRST003] Timed out acquiring connection from connection pool.`
* **Root Cause:** PostgREST implements a connection pool with a default acquisition timeout (usually 10 seconds). When all 100 PostgreSQL connection slots are fully utilized, incoming requests wait in the PostgREST pool queue. If a request is queued for longer than 10 seconds, PostgREST aborts the request and returns a `504 Gateway Timeout`. This accounted for 4.59% of all requests.

### B. `UNKNOWN_ERROR_502` (2,212 occurrences)
* **Error Message in Log:** `status:502 | [] Bad Gateway`
* **Root Cause:** A `502 Bad Gateway` error occurs at the API Gateway layer (e.g., Kong, Nginx, or Supabase boundary proxy). Under extreme concurrency, when PostgREST is saturated with queued requests and the underlying system runs out of sockets or file descriptors (or PostgREST drops connections due to resource starvation), the API Gateway experiences connection drops or socket hang-ups from the upstream server, returning a 502. This accounted for 1.94% of all requests.

### C. `UNKNOWN_ERROR_500` (283 occurrences)
* **Root Cause Breakdown:**
  * **162 occurrences:** `status:500 | [] An unexpected error occurred` (application server middleware timeouts or unhandled internal errors).
  * **94 occurrences:** `status:500 | [57014] canceling statement due to statement timeout` (PostgreSQL query execution exceeded the database-level statement timeout of 10s due to lock waits on write-heavy tables under high disk I/O contention).
  * **27 occurrences:** `status:500 | [] Internal Server Error` (uncaught exceptions).

### Functional Validation & Business Errors (For Context)
* **`status:400 | column lessons.coach_notes does not exist` (10,370 errors):** A functional bug where queries attempted to read `coach_notes` from the `lessons` table (instead of the `users` table).
* **`status:400 | violates check constraint "band_proposal_votes_vote_check"` (1,466 errors):** Functional validation of votes.
* **`status:409 | duplicate key violates "band_song_slots_band_song_id_instrument_part_number_key"` (921 errors):** Database constraint preventing concurrent slot double-bookings in bands.
* **`status:400 | [P0001] Unauthorized` (268 errors) / private events (42 errors):** Row-Level Security (RLS) successfully blocking unauthorized access.

---

## 3. Infrastructure & Deployment Scaling Recommendations

To scale the Groovelab app to support 6,500 active users and eliminate infrastructural errors, we recommend the following multi-tiered strategy:

### 1. PgBouncer Transaction Mode Pooling
* **Why it works**: Currently, each application request establishes or retains a session connection. By deploying PgBouncer in **Transaction Mode**, a PostgreSQL connection is only leased to a client for the duration of a single transaction. Since most queries execute in under 10 ms, a single connection slot can be shared sequentially by dozens of active clients. A pool of 100 PostgreSQL connections can comfortably support thousands of concurrent client requests.
* **Implementation**:
  * Set PgBouncer pool mode to `transaction`.
  * Update the database connection string in the application server to connect to PgBouncer port (default 6543) instead of direct PostgreSQL (default 5432).
* **Caveats**: Transaction mode does not natively support `LISTEN`/`NOTIFY`, prepared statements, or session-level temporary tables. To avoid errors, prepared statements must be disabled in the client library/ORM configuration (e.g., adding `?pgbouncer=true` or setting `statement_cache_size=0`).

### 2. Read-Replicas (Read/Write Split)
* **Why it works**: Our log analysis shows that read operations make up **75.46% of the total request volume** (86,222 out of 114,235 requests).
  * `Student_FetchLessons` (14,779)
  * `Student_LoadDashboard` (14,684)
  * `Student_FetchHelpRequests` (11,167)
  * `Student_FetchEvents` (11,135)
  * `Student_FetchHomework` (11,107)
  * `Student_FetchBands` (11,070)
  * `Teacher_FetchHelpRequests` (2,026)
  * `Teacher_LoadStudents` (2,003)
* **Implementation**: Deploy one or more read-replicas. Configure the Supabase JS client or API route handlers to direct all `GET` / read queries to the replica pool, while directing `POST`/`PATCH`/`DELETE` writes to the primary database master. This resolves read-write transaction lock contention.

### 3. Server Sizing Upgrades (Hetzner VPS)
* **CPU Sizing**: Upgrade the database VPS from shared vCPUs to dedicated vCPUs (e.g., Hetzner CCX series). High transaction rates and RLS evaluation push CPU usage to 75-80% during peak loads.
* **Storage IOPS**: Standard SSD storage can saturate its write-ahead log (WAL) write capacity. Upgrade to NVMe-backed dedicated volumes with guaranteed IOPS to reduce disk flush latency, speed up transaction commits, and release connection locks faster.

### 4. Client-Side Request Optimization
* **Debouncing/Batching**: Implement client-side debounce of 500ms–1000ms for high-frequency interactive events (e.g. logging progress, planning adjustments, voting) to merge multiple requests into a single batch query.
* **Optimistic UI**: Use local state updates immediately in the frontend, queuing database synchronizations in the background. This masks database latency queues from the user.

---

## 4. Quality Review Report

**Verdict**: **REQUEST_CHANGES**

### Findings

#### [Critical] Finding 1: Connection Pool Starvation under Realistic Load
* **What**: PostgreSQL connection pool exhaustion leading to 504 and 502 timeouts.
* **Where**: Database/Infrastructure layer (default 100 connection limit).
* **Why**: Capping connection capacity at 100 connections while processing a write-heavy load of 6,500 active users results in massive queuing, high latencies (p95 of 9.8s), and eventual request drops (5,241 timeouts).
* **Suggestion**: Deploy PgBouncer in transaction mode and restrict application container pool sizes.

#### [Major] Finding 2: Missing Table Schema Column `lessons.coach_notes`
* **What**: `status:400 | [42703] column lessons.coach_notes does not exist` (10,370 errors).
* **Where**: `Student_FetchHomework` endpoint queries.
* **Why**: The application query references a non-existent column in the `lessons` table. This functional bug generated the largest single error volume in the load test.
* **Suggestion**: Update the migration schema to add the column, or rewrite the query to retrieve `coach_notes` from the correct `users` table via a join.

#### [Minor] Finding 3: Database Statement Timeout Canceling
* **What**: `status:500 | [57014] canceling statement due to statement timeout` (94 errors).
* **Where**: PostgreSQL transaction execution.
* **Why**: Under heavy concurrent writes, transaction locks block queries longer than the 10-second server execution threshold.
* **Suggestion**: Set lower statement timeouts (e.g. 3s) to release pool connections faster, and optimize table indexing on high-frequency target tables (`band_proposal_votes`).

### Verified Claims

* **Throughput of ~125.91 req/s** → Verified via python parsing of log file timestamps and line counts → **PASS** (exact value: 125.91 req/s)
* **5,241 UNKNOWN_ERROR_504 errors** → Verified via python count of status code 504 entries → **PASS** (exact value: 5,241)
* **2,212 UNKNOWN_ERROR_502 errors** → Verified via python count of status code 502 entries → **PASS** (exact value: 2,212)
* **283 UNKNOWN_ERROR_500 errors** → Verified via python count of status code 500 entries → **PASS** (exact value: 283)
* **Multi-tenant RLS Isolation Integrity** → Verified 0 cross-school or unauthorized leakage in the logs → **PASS**

### Coverage Gaps
* **PgBouncer prepared statements compatibility** — risk level: **medium** — recommendation: Investigate how Supabase JS client and PostgREST interact with PgBouncer's Transaction Mode regarding prepared statements before pushing to production.

---

## 5. Adversarial Challenge Report

**Overall risk assessment**: **HIGH**

### Challenges

#### [Critical] Challenge 1: Prepared Statement Failures in Transaction Mode
* **Assumption challenged:** That simply placing PgBouncer in transaction mode will work out-of-the-box without application code modifications.
* **Attack scenario:** PostgREST or Supabase JS client issues prepared statements. In PgBouncer transaction mode, subsequent requests may land on different Postgres backend processes that do not have the prepared statement registered, triggering `prepared statement "..." does not exist` SQL errors (error code `26000`).
* **Blast radius:** Complete failure of all write and read queries targeting the pooled connection string.
* **Mitigation:** Force PgBouncer configuration to disable prepared statements, or add `?pgbouncer=true` (or the equivalent pooling configuration) to client connection options.

#### [High] Challenge 2: Read-Replica Consistency Lag
* **Assumption challenged:** That routing read operations to replicas is always safe.
* **Attack scenario:** A student performs a write (e.g. checking in or submitting a help request) and is immediately redirected to a dashboard that fetches data from a read-replica. If the replication lag is 1–2 seconds due to network congestion or primary master lock queues, the read-replica returns stale data (showing the student as not checked in). The student clicks the button again, generating duplicate writes and user frustration.
* **Blast radius:** Stale read states, race conditions, and duplicate transaction submission attempts.
* **Mitigation:** Implement session pinning (route reads to master for a short duration after a write) or enforce strong eventual consistency checks in the client state.

#### [Medium] Challenge 3: Table-Level Lock Contention on High-Frequency Writes
* **Assumption challenged:** That database resource constraints are purely connection-based.
* **Attack scenario:** Under 6,500 active users, multiple students attempt to vote on the same song proposal (`Student_VoteOnProposal`) concurrently. This targets the `band_proposal_votes` table. Concurrent inserts/updates on the same table or foreign key indexes trigger transaction lock queues.
* **Blast radius:** Queries hang waiting for locks, inflating execution times and triggering statement timeouts (57014) even if the connection limit is solved.
* **Mitigation:** Optimize indexes to prevent full index scans on validation checks, and use fine-grained row-level locking or queue writes in an application cache layer.

### Stress Test Results

* **6,500 concurrent sessions on 100 connections** → Expecting connection queue overflow → **FAIL** (Resulted in 5,241 pool timeouts and 2,212 gateway drops).
* **Missing Column Queries under Concurrency** → Expecting query fail fast without resource leak → **PASS** (Database immediately rejected with 400 error in ~20ms, meaning the missing column query did not tie up connections for long).
* **Row-Level Security execution overhead** → Expecting CPU overhead under RLS policies → **PASS** (No security leaks, but CPU rose to 75-80% showing RLS checking adds significant evaluation overhead).

### Unchallenged Areas
* **Real network latency jitter** — Reason not challenged: The simulation was run within a local/virtual environment with minimal network latency variation. In a real-world multi-region deployment, network roundtrips between the client, gateway, and database will amplify connection holding times, exacerbating starvation.
