import json

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/5ca7972a-16fb-4a7f-9d8d-52fce61bcbe2/.system_generated/logs/transcript.jsonl"
with open(log_file, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            entry = json.loads(line)
            if entry.get("step_index") == 69:
                print("Line length:", len(line))
                print(line[:1000])
                print("...")
                print(line[-1000:])
                # Try parsing it
                try:
                    data = json.loads(line)
                    print("Successfully parsed line!")
                except Exception as e:
                    print("Parse error:", e)
        except Exception as e:
            pass
