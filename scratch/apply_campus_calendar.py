import json
import os

dashboard_path = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/AdminDashboard.tsx'
transcript_path = '/Users/patrickhuber/.gemini/antigravity/brain/9d55fefd-5e80-44a3-b731-8875d1df7f7a/.system_generated/logs/transcript.jsonl'

with open(dashboard_path, 'r', encoding='utf-8') as f:
    content = f.read()

edits = []
steps = []
with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except Exception:
            continue
        idx = obj.get('step_index')
        if idx is not None and idx >= 10700:
            if obj.get('source') == 'MODEL' and obj.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in obj:
                for tc in obj['tool_calls']:
                    name = tc.get('name')
                    args = tc.get('args') or {}
                    tf = args.get('TargetFile') or args.get('targetFile') or ''
                    if name in ['replace_file_content', 'multi_replace_file_content'] and 'AdminDashboard.tsx' in tf:
                        edits.append({
                            'step_index': idx,
                            'name': name,
                            'args': args
                        })

print(f"Found {len(edits)} edits >= 10700.")

def clean_target(s):
    if not s:
        return ''
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    s = s.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
    return s.replace('\r\n', '\n')

current_content = content
for i, edit in enumerate(edits):
    idx = edit['step_index']
    name = edit['name']
    args = edit['args']
    desc = args.get('Description') or args.get('Instruction') or ''
    
    if name == 'replace_file_content':
        target = clean_target(args.get('TargetContent') or args.get('targetContent'))
        replacement = clean_target(args.get('ReplacementContent') or args.get('replacementContent'))
        if not target:
            continue
        if target not in current_content:
            print(f"[{i+1}] Step {idx} (replace) FAILED: target not found.")
            print(f"  Target sample: {repr(target[:100])}")
            continue
        current_content = current_content.replace(target, replacement)
        print(f"[{i+1}] Step {idx} (replace) SUCCESS.")
    elif name == 'multi_replace_file_content':
        chunks = args.get('ReplacementChunks') or args.get('replacementChunks') or []
        if isinstance(chunks, str):
            try:
                chunks = json.loads(chunks)
            except Exception:
                try:
                    chunks = eval(chunks)
                except Exception:
                    continue
        success_count = 0
        for chunk_idx, chunk in enumerate(chunks):
            if not isinstance(chunk, dict):
                continue
            target = clean_target(chunk.get('TargetContent') or chunk.get('targetContent'))
            replacement = clean_target(chunk.get('ReplacementContent') or chunk.get('replacementContent'))
            if not target:
                continue
            if target not in current_content:
                print(f"[{i+1}] Step {idx} (multi chunk {chunk_idx}) FAILED: target not found.")
                continue
            current_content = current_content.replace(target, replacement)
            success_count += 1
        print(f"[{i+1}] Step {idx} (multi) SUCCESS: {success_count}/{len(chunks)} chunks.")

with open('/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/AdminDashboard_calendar_restored.tsx', 'w', encoding='utf-8') as f:
    f.write(current_content)
print("Saved to scratch/AdminDashboard_calendar_restored.tsx")
