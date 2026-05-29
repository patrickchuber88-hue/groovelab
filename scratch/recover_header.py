import json
import os

transcript_path = "/Users/patrickhuber/.gemini/antigravity/brain/48320f16-4765-4ef6-b5b3-d672d69331ad/.system_generated/logs/transcript.jsonl"

if os.path.exists(transcript_path):
    print("Found 48320f16-4765-4ef6-b5b3-d672d69331ad transcript!")
    with open(transcript_path, "r", encoding="utf-8") as f:
        for idx, line in enumerate(f):
            if "StudentAvatarDashboard" in line or "bist" in line or "Schön" in line:
                try:
                    obj = json.loads(line)
                    # Print if it has tool calls or interesting type
                    if obj.get("type") in ["WRITE_TO_FILE", "REPLACE_FILE_CONTENT", "MULTI_REPLACE_FILE_CONTENT", "VIEW_FILE"]:
                        print(f"Step {obj.get('step_index')}, Type: {obj.get('type')}, Len: {len(obj.get('content', ''))}")
                        tool_calls = obj.get("tool_calls", [])
                        for tc in tool_calls:
                            args = tc.get("args", {})
                            code = args.get("CodeContent") or args.get("ReplacementContent")
                            if code:
                                print(f"  Code written, len: {len(code)}")
                                with open(f"/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/header_edit_{obj.get('step_index')}.txt", "w", encoding="utf-8") as out:
                                    out.write(code)
                except Exception as e:
                    pass
else:
    print("Transcript not found")
