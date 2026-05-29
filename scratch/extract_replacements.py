import json
import os

convos = [
    "9ee0e02a-aa63-47df-b8c9-68eaf3fd5d04",
    "685763ff-24f5-48da-88ed-e570c972cbce",
    "4fbbcddf-afb4-4b97-a67d-4d447ce3fe5d",
    "5ae4aa98-882f-4b52-ab8f-8aa85827fc18",
    "53987ceb-4622-45c0-8dc2-1fcad6cb112f",
    "c6ced4a1-25d2-4736-a23c-ff2473a351d3"
]

all_replacements = []

for c in convos:
    log_file = f"/Users/patrickhuber/.gemini/antigravity/brain/{c}/.system_generated/logs/transcript.jsonl"
    if os.path.exists(log_file):
        with open(log_file, "r") as f:
            for line in f:
                try:
                    entry = json.loads(line)
                    if entry.get("source") == "MODEL" and "tool_calls" in entry:
                        for tc in entry["tool_calls"]:
                            if tc["name"] in ["replace_file_content"]:
                                args = tc.get("args", {})
                                if "StudentAvatarDashboard.tsx" in args.get("TargetFile", ""):
                                    all_replacements.append({
                                        "target": args.get("TargetContent", ""),
                                        "replacement": args.get("ReplacementContent", "")
                                    })
                            elif tc["name"] in ["multi_replace_file_content"]:
                                args = tc.get("args", {})
                                if "StudentAvatarDashboard.tsx" in args.get("TargetFile", ""):
                                    for chunk in args.get("ReplacementChunks", []):
                                        all_replacements.append({
                                            "target": chunk.get("TargetContent", ""),
                                            "replacement": chunk.get("ReplacementContent", "")
                                        })
                except Exception as e:
                    pass

with open("scratch/all_ui_replacements.json", "w") as f:
    json.dump(all_replacements, f, indent=2)

print(f"Extracted {len(all_replacements)} replacements.")
