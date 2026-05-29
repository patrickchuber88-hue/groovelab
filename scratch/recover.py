import json

log_path = "/Users/patrickhuber/.gemini/antigravity/brain/6a7a129c-3baf-40e6-b951-0051be0596c1/.system_generated/logs/transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
            # Find the view_file step that fetched lines 2301 to 3100 of TeacherDashboard.tsx
            if step.get('type') == 'VIEW_FILE' or 'TeacherDashboard.tsx' in str(step):
                for tool in step.get('tool_calls', []):
                    if tool.get('ToolName') == 'view_file' or 'view_file' in str(tool):
                        print("Found view_file step index:", step.get('step_index'))
                # If this is the step containing the output
                if 'Showing lines 2301 to 3100' in str(step.get('content', '')):
                    print("Found output in content!")
                    with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_part.txt', 'w', encoding='utf-8') as out:
                        out.write(step['content'])
                    print("Successfully wrote recovered_part.txt!")
        except Exception as e:
            pass
