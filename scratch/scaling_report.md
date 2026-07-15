# Load Scaling Simulation Report
Generated: 2026-07-12T19:42:20.260Z

Starting Scaling Loop at iteration 1...

--- Iteration 1 ---
Configuration: 8 schools, 50 teachers/school, 500 students/school (Total: 4000 students, 400 teachers)
Concurrency: 40 VUs, Duration: 60s
Generating mock data...
Running simulation...

Iteration 1 Results:
- Total Requests: 9224
- Success Rate: 98.42%
- Error Rate: 1.58%
- p95 Latency: 393ms
- CPU Load (VPS): 8.71
Threshold checks:
- CPU Load < 8.0: FAIL (8.71)
- p95 Latency < 800ms: PASS (393ms)
- Error Rate < 8%: PASS (1.58%)

Status: LIMIT EXCEEDED. One of the conditions failed!
Scaling limit identified at Iteration 1!

Running final database cleanup to restore database to original state...
🎉 Scaling simulation completed and cleaned up successfully!
