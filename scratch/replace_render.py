import json
import os
import glob

# Search in the app data directory for gemini brain conversations
brain_dir = "/Users/patrickhuber/.gemini/antigravity/brain"
log_files = glob.glob(os.path.join(brain_dir, "*", ".system_generated", "logs", "transcript.jsonl"))

found_saves = []

for log_path in log_files:
    conv_id = log_path.split("/")[-4]
    print(f"Scanning conversation: {conv_id}...")
    with open(log_path, 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            try:
                step = json.loads(line)
                step_str = json.dumps(step)
                if 'TeacherDashboard.tsx' in step_str:
                    # Look for write_to_file or replace_file_content with large chunks
                    for tool in step.get('tool_calls', []):
                        args = tool.get('Arguments', {})
                        content = args.get('CodeContent', '') or args.get('ReplacementContent', '')
                        if content and len(content) > 10000 and 'Tagesplan' in content:
                            mtime = os.path.getmtime(log_path)
                            found_saves.append({
                                'conv_id': conv_id,
                                'step': step.get('step_index'),
                                'tool': tool.get('ToolName'),
                                'mtime': mtime,
                                'content': content
                            })
                            print(f"  Found potential full file write in step {step.get('step_index')} of {conv_id}! Length={len(content)}")
            except Exception as e:
                pass

# Sort by modification time (most recent first)
found_saves.sort(key=lambda x: x['mtime'], reverse=True)

if found_saves:
    newest = found_saves[0]
    print(f"Newest full dashboard save found in conv {newest['conv_id']}, step {newest['step']}, tool {newest['tool']} (len={len(newest['content'])})")
    with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/restore_dashboard_perfect.py', 'w', encoding='utf-8') as out:
        out.write(newest['content'])
    print("Wrote best full dashboard file to scratch/restore_dashboard_perfect.py!")
else:
    print("No large content write found in any conversation log.")
