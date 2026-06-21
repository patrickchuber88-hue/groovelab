import re
from collections import Counter

log_path = "/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/simulation_realistic_15m.log"

status_counts = Counter()
error_messages = Counter()
latencies = []
endpoints = Counter()
by_endpoint_latency = {}

pattern = re.compile(
    r'^(\S+) \[[^\]]+\] \[[^\]]+\] (\S+) (\S+) -> status:(\S+)(?: \((\d+)ms\))?(?: \| Error: (.*))?$'
)

unmatched_count = 0

with open(log_path, 'r') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        m = pattern.match(line)
        if m:
            ts, method, endpoint, status, latency_str, err_msg = m.groups()
            status_counts[status] += 1
            endpoints[endpoint] += 1
            if err_msg:
                error_messages[f"status:{status} | {err_msg}"] += 1
            elif int(status) >= 400:
                error_messages[f"status:{status} | no_msg"] += 1
            
            if latency_str:
                latency = int(latency_str)
                latencies.append(latency)
                if endpoint not in by_endpoint_latency:
                    by_endpoint_latency[endpoint] = []
                by_endpoint_latency[endpoint].append(latency)
        else:
            unmatched_count += 1
            if unmatched_count <= 20:
                print(f"UNMATCHED: {line}")

def get_percentile(data, q):
    if not data:
        return 0
    sorted_data = sorted(data)
    index = (len(sorted_data) - 1) * (q / 100.0)
    idx_floor = int(index)
    fraction = index - idx_floor
    if fraction == 0:
        return sorted_data[idx_floor]
    else:
        return sorted_data[idx_floor] * (1 - fraction) + sorted_data[idx_floor + 1] * fraction

total_parsed = sum(status_counts.values())

print(f"\nTotal parsed lines: {total_parsed}")
print(f"Total unmatched lines: {unmatched_count}")

print("\nStatus counts:")
for s, c in sorted(status_counts.items()):
    pct = (c / total_parsed) * 100 if total_parsed else 0
    print(f"  {s}: {c} ({pct:.2f}%)")

print("\nError messages (top 20):")
for e, c in error_messages.most_common(20):
    print(f"  {e}: {c}")

if latencies:
    print("\nOverall Latencies:")
    print(f"  p50: {get_percentile(latencies, 50):.2f} ms")
    print(f"  p90: {get_percentile(latencies, 90):.2f} ms")
    print(f"  p95: {get_percentile(latencies, 95):.2f} ms")
    print(f"  p99: {get_percentile(latencies, 99):.2f} ms")
    print(f"  max: {max(latencies)} ms")

print("\nLatencies by Endpoint (top 15 endpoints by volume):")
for endpoint, count in endpoints.most_common(15):
    lats = by_endpoint_latency.get(endpoint, [])
    if lats:
        print(f"  {endpoint} (count={count}):")
        print(f"    p50: {get_percentile(lats, 50):.2f} ms | p95: {get_percentile(lats, 95):.2f} ms | p99: {get_percentile(lats, 99):.2f} ms")
    else:
        print(f"  {endpoint} (count={count}): No latencies recorded")
