import json
import os

conv_id = "52f561b0-93f7-429d-8bfe-17475885b358"
log_path = f"/Users/patrickhuber/.gemini/antigravity/brain/{conv_id}/.system_generated/logs/transcript.jsonl"

if os.path.exists(log_path):
    print("Found log file for 52f561b0!")
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            try:
                step = json.loads(line)
                step_str = json.dumps(step)
                if 'TeacherDashboard.tsx' in step_str:
                    print(f"Step {step.get('step_index')}: type={step.get('type')}, length={len(step_str)}")
                    for tool in step.get('tool_calls', []):
                        args = tool.get('Arguments', {})
                        content = args.get('ReplacementContent', '') or args.get('CodeContent', '')
                        if content and len(content) > 1000:
                            print(f"  Found tool call {tool.get('ToolName')} content, length={len(content)}")
                            with open(f"/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/code_{conv_id}_{step.get('step_index')}.txt", 'w', encoding='utf-8') as out:
                                out.write(content)
            except Exception as e:
                pass
else:
    print("Log not found.")
