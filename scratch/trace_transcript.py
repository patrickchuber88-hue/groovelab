import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/cfb0e211-4775-43da-aab2-3c4762ae6d28/.system_generated/logs/transcript.jsonl"
steps = []

with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            idx = entry.get("step_index")
            if "StudentAvatarDashboard.tsx" in line:
                if entry.get("source") == "MODEL" and "tool_calls" in entry:
                    for tc in entry["tool_calls"]:
                        if "StudentAvatarDashboard.tsx" in str(tc):
                            steps.append(f"Step {idx}: MODEL called {tc['name']}")
                elif entry.get("source") == "SYSTEM":
                    steps.append(f"Step {idx}: SYSTEM response")
        except Exception as e:
            pass

for s in steps[-50:]:
    print(s)
