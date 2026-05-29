import json
import os

conversations = [
    "c734b027-579c-41aa-b869-c90690706fe4",
    "749e7a20-e478-44d5-84c9-7958317d5871",
    "05c40c8d-1940-4b14-96a0-d18ed64ed6d8",
    "c849f9ee-b052-4620-aa72-0fd5fe5d386b",
    "6647b107-0f61-47ee-a61d-f0612ef6772d",
    "c23005a3-6fbe-4046-b97b-3ea08547aeba"
]

found = False

for conv_id in conversations:
    log_path = f"/Users/patrickhuber/.gemini/antigravity/brain/{conv_id}/.system_generated/logs/transcript.jsonl"
    if not os.path.exists(log_path):
        continue
    print(f"Scanning conversation {conv_id}...")
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            try:
                step = json.loads(line)
                step_str = json.dumps(step)
                # We search for replaces or view_files that mention TeacherDashboard.tsx and have briefing layouts
                if 'TeacherDashboard.tsx' in step_str and ('Tagesplan (Unterrichte Heute)' in step_str or 'AdminLTE' in step_str):
                    print(f"  Step {step.get('step_index')}: type={step.get('type')}, length={len(step_str)}")
                    # Write out any tool call replacement content or view file
                    for tool in step.get('tool_calls', []):
                        args = tool.get('Arguments', {})
                        replacement = args.get('ReplacementContent', '')
                        if replacement and 'Tagesplan (Unterrichte Heute)' in replacement:
                            print(f"    Found replacement in tool call! Length={len(replacement)}")
                            with open(f"/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/match_{conv_id}_{step.get('step_index')}.txt", 'w', encoding='utf-8') as out:
                                out.write(replacement)
                            found = True
            except Exception as e:
                pass

if found:
    print("Found matching dashboard blocks in past conversation logs!")
else:
    print("No matching blocks found.")
