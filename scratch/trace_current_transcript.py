import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/5ca7972a-16fb-4a7f-9d8d-52fce61bcbe2/.system_generated/logs/transcript.jsonl"
modified_files = {}

with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            idx = entry.get("step_index")
            source = entry.get("source")
            t = entry.get("type")
            
            if source == "MODEL" and "tool_calls" in entry:
                for tc in entry["tool_calls"]:
                    name = tc.get("name")
                    args = tc.get("arguments") or tc.get("args") or {}
                    target = args.get("TargetFile") or args.get("TargetPath") or args.get("AbsolutePath") or args.get("Target")
                    if target and name in ["replace_file_content", "multi_replace_file_content", "write_to_file"]:
                        modified_files[target] = modified_files.get(target, []) + [idx]
        except Exception as e:
            pass

print("=== Modified Files ===")
for file, steps in sorted(modified_files.items()):
    print(f"- {file}: steps {steps}")
