import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/cfb0e211-4775-43da-aab2-3c4762ae6d28/.system_generated/logs/transcript.jsonl"
with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("source") == "SYSTEM" and entry.get("type") == "TOOL_RESPONSE":
                content = entry.get("content", "")
                if "StudentAvatarDashboard" in content:
                    print(f"Found in step {entry.get('step_index')}")
                    print(content[:200])
                    print("---")
        except Exception as e:
            pass
