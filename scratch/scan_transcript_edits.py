import re

log_file = "/Users/patrickhuber/.gemini/antigravity/brain/5ca7972a-16fb-4a7f-9d8d-52fce61bcbe2/.system_generated/logs/transcript.jsonl"

with open(log_file, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if 'AdminDashboard.tsx' in line:
            # check if it contains replacement content
            if 'ReplacementContent' in line or 'replacementContent' in line:
                is_truncated = '<truncated' in line
                # Find step index using regex
                step_match = re.search(r'"step_index":(\d+)', line)
                step_idx = step_match.group(1) if step_match else 'unknown'
                
                # Find tool name
                tool_match = re.search(r'"name":"(replace_file_content|multi_replace_file_content)"', line)
                tool_name = tool_match.group(1) if tool_match else 'unknown'
                
                print(f"Line {i+1} - Step {step_idx}: Tool {tool_name} | Truncated: {is_truncated} | Length: {len(line)}")
