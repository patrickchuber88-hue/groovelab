import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/cfb0e211-4775-43da-aab2-3c4762ae6d28/.system_generated/logs/transcript.jsonl"
last_content = None

with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("source") == "MODEL" and "tool_calls" in entry:
                for tc in entry["tool_calls"]:
                    if tc["name"] in ["replace_file_content", "write_to_file", "multi_replace_file_content"]:
                        args = tc.get("args", {})
                        target = args.get("TargetFile", "")
                        if "StudentAvatarDashboard.tsx" in target:
                            # It modified it! But wait, do we have the full content?
                            pass
            elif entry.get("source") == "SYSTEM" and entry.get("type") == "TOOL_RESPONSE":
                # Look for view_file output!
                pass
        except:
            pass

print("Done")
