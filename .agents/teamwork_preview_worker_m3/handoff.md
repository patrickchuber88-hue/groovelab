# Handoff Report — Load Simulation Execution Analysis

## 1. Observation
- **Simulation Log Location**: `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/simulation_realistic_15m.log`
- **Simulation Duration**: Starting timestamp `2026-06-21T10:22:23.291Z` (first entry in `simulation_realistic_15m.log`) and final summary timestamp at `2026-06-21T10:37:27.071Z` (final entry), representing an actual execution time of `903.78` seconds (approximately 15 minutes and 3 seconds). The final summary reports:
  ```
  === FINAL SIMULATION SUMMARY ===
  Elapsed time:      907.3s / 900s
  Total requests:    114235
  Active requests:   0
  Throughput:        125.91 req/s
  Success rate:      81.45%
  ```
- **Latency Percentiles**:
  - **p50**: 1005 ms
  - **p95**: 9827 ms
  - **p99**: 10032 ms
- **Error Count and Breakdown**:
  - Total Errors: 21,195 (calculated as `114235 * (1 - 0.8145) = 21190.58` or explicitly detailed in the JSON summary)
  - RLS Violations: 268 (`RLS_VIOLATION`)
  - DB Exceptions: 20,927
  - Logic Conflicts: 0
  - Error breakdown by type (from log summary):
    ```json
    {"DB_EXCEPTION_42703":10370,"RLS_VIOLATION":268,"DB_EXCEPTION_P0001":42,"DB_EXCEPTION_23514":1466,"DB_EXCEPTION_PGRST204":305,"DB_EXCEPTION_23505":1008,"UNKNOWN_ERROR_500":283,"UNKNOWN_ERROR_504":5241,"UNKNOWN_ERROR_502":2212}
    ```
- **Log Entry Samples**:
  - *Start of simulation*:
    ```
    2026-06-21T10:22:23.291Z [57a2615b-c39d-4270-ac2c-c6c763fda4c5] [46bace52-2d7a-4a87-aae2-5778ded238cb] POST Student_CheckIn -> status:201 (24ms)
    2026-06-21T10:22:23.347Z [45994e80-2b16-442a-a068-31c54fc606d8] [109e83b3-a1ff-42f0-95b9-db6562f8e77d] GET Student_FetchLessons -> status:200 (20ms)
    2026-06-21T10:22:23.517Z [abd07080-2d95-4a78-8916-e359d0df7131] [41c07ebd-1b59-4f75-8359-408d957dd080] GET Student_FetchHomework -> status:400 (19ms) | Error: [42703] column lessons.coach_notes does not exist
    ```
  - *End of simulation*:
    ```
    2026-06-21T10:37:26.156Z [784dba21-1c29-482b-b8ad-56d2b186432c] [01329036-22f0-4424-b9e5-9064df450841] GET Student_LoadDashboard -> status:200 (5424ms)
    2026-06-21T10:37:26.158Z [be0ced00-c61c-4f5a-a1eb-bc8ce826f6f5] [5e0b8364-12dd-43b1-aeb5-17417d53e957] POST Teacher_CheckConflicts -> status:200 (4472ms)
    2026-06-21T10:37:26.218Z [1eb97fa9-4da7-4228-923c-b8a3ed5b92b7] [109e83b3-a1ff-42f0-95b9-db6562f8e77d] GET Student_FetchHomework -> status:400 (4050ms) | Error: [42703] column lessons.coach_notes does not exist
    ```

## 2. Logic Chain
1. **Verification of Duration**:
   - The first request log entry timestamp is `10:22:23.291Z`.
   - The last request log entry timestamp is `10:37:27.071Z`.
   - The difference is exactly `15 minutes and 3.78 seconds`, validating that the load test successfully ran for the planned 15-minute period.
2. **Analysis of Performance & Latencies**:
   - Total requests reached `114,235` at a throughput of `125.91 req/s`.
   - The median (p50) latency was `1005 ms`. The p95 (`9827 ms`) and p99 (`10032 ms`) latencies show a severe deterioration of responsiveness under peak concurrency.
   - The throughput remained high, but a significant portion of requests started failing or timing out due to backend saturation (evidenced by 504 and 502 errors).
3. **Analysis of Errors**:
   - **Schema mismatch / code defect**: `DB_EXCEPTION_42703` (10,370 occurrences) represents the most common error. The column `lessons.coach_notes` does not exist in the database, yet the client query requests it.
   - **Check Constraint Violations**: `DB_EXCEPTION_23514` (1,466 occurrences) indicates business logic rules (such as check constraints on lesson times, student/teacher attributes, etc.) were violated.
   - **Concurrency / Race Conditions**: `DB_EXCEPTION_23505` (1,008 occurrences) shows duplicate unique keys, likely occurring when multiple simulated users concurrently checked in, proposed songs, or joined bands.
   - **Gateway and Resource Saturation**:
     - `UNKNOWN_ERROR_504` (5,241 occurrences) and `UNKNOWN_ERROR_502` (2,212 occurrences) represent server bottlenecks. Under high concurrency, Supabase / Postgres failed to respond timely, causing timeouts and bad gateway responses.
   - **Row Level Security (RLS)**: `RLS_VIOLATION` (268 occurrences) indicating access policy blocks.
   - **Logic Conflicts**: `0` occurrences, indicating that application-level conflicts handled inside user transactions or explicit conflict checkers did not crash with custom codes.

## 3. Caveats
- No real network roundtrips occurred over the internet (Supabase instances run locally or inside a private staging environment, and the CODE_ONLY constraints prevented external network auditing).
- Client-side CPU and memory throttling during spawning of 6,465 virtual user loops could have contributed to response latency spikes.
- Dry-run comparison showed the same `DB_EXCEPTION_42703` error (`column lessons.coach_notes does not exist`), confirming it is a static bug in the application rather than a transient load-related failure.

## 4. Conclusion
The simulation successfully completed the 15-minute load run. The Groovelab application experiences major throughput bottlenecks under load (yielding p50 latencies over 1s and thousands of 502/504 gateway errors). Additionally, there is a prominent schema defect regarding `lessons.coach_notes` which causes thousands of 400 Bad Requests. Fixing this schema bug and implementing rate-limiting or query optimization is highly recommended.

## 5. Verification Method
To verify the execution of this simulation, inspect the files and output logs:
1. View the final metrics summary block at the end of `/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/simulation_realistic_15m.log`.
2. Inspect the background task log `/Users/patrickhuber/.gemini/antigravity/brain/2ccd4b36-ad9e-4224-af6b-8249dce0e555/.system_generated/tasks/task-35.log` for the detailed console output.
