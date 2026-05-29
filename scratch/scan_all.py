import json
import os

conv_id = "05c40c8d-1940-4b14-96a0-d18ed64ed6d8"
log_path = f"/Users/patrickhuber/.gemini/antigravity/brain/{conv_id}/.system_generated/logs/transcript.jsonl"

if os.path.exists(log_path):
    print("Found log file!")
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                step = json.loads(line)
                step_idx = step.get("step_index")
                step_type = step.get("type")
                tool_calls = step.get("tool_calls", [])
                for tc in tool_calls:
                    if tc.get("ToolName") in ["replace_file_content", "multi_replace_file_content"]:
                        args = tc.get("Arguments", {})
                        if "TeacherDashboard.tsx" in args.get("TargetFile", ""):
                            print(f"Step {step_idx}: {tc.get('ToolName')}")
                            # Write to file
                            out_path = f"/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/edit_{conv_id}_{step_idx}.txt"
                            with open(out_path, "w", encoding="utf-8") as out:
                                out.write(json.dumps(args, indent=2))
            except Exception as e:
                pass
else:
    print("Log not found.")
