import json
import os
import glob

brain_dir = "/Users/patrickhuber/.gemini/antigravity/brain"
transcripts = glob.glob(os.path.join(brain_dir, "*/.system_generated/logs/transcript.jsonl"))

matches = []

for tp in transcripts:
    with open(tp, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if "StudentAvatarDashboard.tsx" in line:
                try:
                    obj = json.loads(line)
                    # Let's save metadata
                    matches.append({
                        "conv": tp.split('/')[-4],
                        "step": obj.get("step_index"),
                        "type": obj.get("type"),
                        "line": idx,
                        "content_len": len(obj.get("content", "")),
                        "has_tool_calls": len(obj.get("tool_calls", [])) > 0
                    })
                except Exception as e:
                    pass

# Print sorted matches
for m in sorted(matches, key=lambda x: (x["conv"], x["step"])):
    print(m)
