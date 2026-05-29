import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/cfb0e211-4775-43da-aab2-3c4762ae6d28/.system_generated/logs/transcript.jsonl"
steps = []

with open(log_file, "r") as f:
    for line in f:
        try:
            entry = json.loads(line)
            idx = entry.get("step_index")
            if entry.get("type") == "USER_INPUT":
                print(f"Step {idx}: {entry.get('content')}")
        except Exception as e:
            pass
