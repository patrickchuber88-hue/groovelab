import json

log_path = "/Users/patrickhuber/.gemini/antigravity/brain/e8d2587f-498d-4377-b257-5215bda48958/.system_generated/logs/transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if "renderSubjectsBoard" in line:
            try:
                entry = json.loads(line)
                print(f"Line {line_num} | Step {entry.get('step_index')} | Source {entry.get('source')} | Type {entry.get('type')} | Status {entry.get('status')} | Line Length {len(line)}")
            except Exception as e:
                print(f"Line {line_num} contains renderSubjectsBoard but failed JSON parse: {e}. Line Length {len(line)}")
