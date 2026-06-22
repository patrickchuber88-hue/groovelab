# Campus-Groovelab Server Stress-Test Report

Date: 6/22/2026, 4:07:43 PM

==================================================
  Campus-Groovelab Platform Limits Stress-Test  
==================================================

--- STAGE 1 ---

--- Starting Test Stage: 5 Schools, 2500 Users ---
Provisioning 5 temporary schools...
Generating and inserting 2500 user profiles...
Provisioning completed. Starting load simulation...
[Mid-test Server Stats] CPU Load Average: 5.76, Memory Used: 2117MB / 3819MB, Swap Used: 1937MB
Cleaning up temporary schools and users...
[Results] Requests Sent: 11819, Throughput: 394.0 req/s
[Latency] Avg: 234.3ms, p95: 666ms
[Errors] Count: 0, Error Rate: 0.00%
✅ Stage passed successfully!

--- STAGE 2 ---

--- Starting Test Stage: 10 Schools, 5000 Users ---
Provisioning 10 temporary schools...
Generating and inserting 5000 user profiles...
Provisioning completed. Starting load simulation...
[Mid-test Server Stats] CPU Load Average: 8.29, Memory Used: 2164MB / 3819MB, Swap Used: 1919MB
Cleaning up temporary schools and users...
[Results] Requests Sent: 12670, Throughput: 422.3 req/s
[Latency] Avg: 217.1ms, p95: 613ms
[Errors] Count: 0, Error Rate: 0.00%
❌ LIMIT DETECTED! Reason(s):
  - CPU load too high: 8.29

==================================================
🛑 STRESS TEST COMPLETED: Limit hit at Stage 2!
Max stable configuration was: 5 Schools and 2500 Users
==================================================

## Stress-Test History Summary

| Stage | Schools | Users | Throughput (req/s) | Avg Latency (ms) | p95 Latency (ms) | Error Rate (%) | CPU Load | Memory (Used/Total) |
|---|---|---|---|---|---|---|---|---|
| 1 | 5 | 2500 | 394.0 | 234.3 | 666 | 0.00% | 5.76 | 2117MB / 3819MB |
| 2 | 10 | 5000 | 422.3 | 217.1 | 613 | 0.00% | 8.29 | 2164MB / 3819MB |
