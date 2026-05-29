import json
import os

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/cfb0e211-4775-43da-aab2-3c4762ae6d28/.system_generated/logs/transcript.jsonl"
views = []

with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("source") == "SYSTEM" and entry.get("type") == "TOOL_RESPONSE":
                content = entry.get("content", "")
                # Some tools wrap it in json
                if isinstance(content, str):
                    if "StudentAvatarDashboard" in content and "export function" in content:
                        idx = entry.get("step_index")
                        views.append((idx, content))
        except Exception as e:
            pass

for idx, content in views:
    with open(f"scratch/recovered_view_{idx}.tsx", "w") as out:
        out.write(content)
    print(f"Saved step {idx}")
