import json

log_path = "/Users/patrickhuber/.gemini/antigravity/brain/e8d2587f-498d-4377-b257-5215bda48958/.system_generated/logs/transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        if '"step_index":478' in line:
            print(f"Line {line_num} contains step 478.")
            try:
                entry = json.loads(line)
                print("Keys:", entry.keys())
                # Print the content
                print("Content length:", len(str(entry.get("content", ""))))
                # Print the tool calls
                tcs = entry.get("tool_calls", [])
                print("Tool calls count:", len(tcs))
                for i, tc in enumerate(tcs):
                    print(f"Tool Call {i}: name={tc.get('name')}")
                    print("Arguments keys:", tc.get("args", {}).keys() if "args" in tc else tc.get("Arguments", {}).keys())
                    # Dump arguments to file
                    out_path = f"scratch/step_478_args.json"
                    with open(out_path, "w") as out:
                        json.dump(tc, out, indent=2)
                    print(f"Saved tool call to {out_path}")
            except Exception as e:
                print("Error parsing line:", e)
