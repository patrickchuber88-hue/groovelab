import json

log_path = "/Users/patrickhuber/.gemini/antigravity/brain/e8d2587f-498d-4377-b257-5215bda48958/.system_generated/logs/transcript.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, 1):
        try:
            entry = json.loads(line)
            tool_calls = entry.get("tool_calls", [])
            for tc in tool_calls:
                name = tc.get("name")
                args = tc.get("Arguments", tc.get("args", {}))
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        pass
                
                if isinstance(args, dict):
                    rep_content = args.get("ReplacementContent", "") or args.get("CodeContent", "")
                    target_file = args.get("TargetFile", "")
                    
                    if "renderSubjectsBoard" in rep_content or "renderSubjectsBoard" in str(args):
                        print(f"--- MATCH AT LINE {line_num} (step {entry.get('step_index')}) ---")
                        print(f"Tool Name: {name}")
                        print(f"Target File: {target_file}")
                        print(f"StartLine: {args.get('StartLine')} | EndLine: {args.get('EndLine')}")
                        print(f"TargetContent Length: {len(args.get('TargetContent', ''))}")
                        print(f"ReplacementContent/CodeContent Length: {len(rep_content)}")
                        
                        out_name = f"scratch/recovered_{entry.get('step_index')}.txt"
                        with open(out_name, "w", encoding="utf-8") as out:
                            out.write(rep_content)
                        print(f"Saved full content of length {len(rep_content)} to {out_name}")
                        
        except Exception as e:
            pass
