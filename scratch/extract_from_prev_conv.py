import json
import os

convo_id = "c6ced4a1-25d2-4736-a23c-ff2473a351d3"
log_file = f"/Users/patrickhuber/.gemini/antigravity/brain/{convo_id}/.system_generated/logs/transcript.jsonl"
views = []

if not os.path.exists(log_file):
    print("No log file found!")
else:
    with open(log_file, "r") as f:
        for line in f:
            try:
                entry = json.loads(line)
                if entry.get("source") == "SYSTEM" and entry.get("type") == "TOOL_RESPONSE":
                    content = entry.get("content", "")
                    if isinstance(content, str) and "export function StudentAvatarDashboard" in content:
                        idx = entry.get("step_index")
                        views.append((idx, content))
            except Exception as e:
                pass

    if views:
        # Get the latest one
        last_idx, last_content = views[-1]
        with open("scratch/recovered_from_prev.tsx", "w") as out:
            out.write(last_content)
        print(f"Recovered from prev conv step {last_idx}")
    else:
        print("No view found in prev conv.")
