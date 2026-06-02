import json

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/9c9659ae-5078-4246-a021-c1cad5812f8a/.system_generated/logs/transcript.jsonl"

calls = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        try:
            obj = json.loads(line)
            step = obj.get("step_index", 0)
            if step >= 1124:
                continue
            for tc in obj.get("tool_calls", []):
                name = tc.get("name")
                args = tc.get("args", {})
                if "MeisterwerkDocumentationModal.tsx" in str(args.values()):
                    calls.append((step, idx + 1, name, list(args.keys())))
        except Exception as e:
            pass

print("First 30 tool calls on MeisterwerkDocumentationModal.tsx:")
for step, line_num, name, arg_keys in calls[:30]:
    print(f"Step {step} (Line {line_num}): {name} (Args: {arg_keys})")
