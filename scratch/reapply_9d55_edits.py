import json
import os
import sys

dashboard_path = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/AdminDashboard.tsx'
transcript_path = '/Users/patrickhuber/.gemini/antigravity/brain/9d55fefd-5e80-44a3-b731-8875d1df7f7a/.system_generated/logs/transcript.jsonl'

# Read current file content
with open(dashboard_path, 'r', encoding='utf-8') as f:
    current_content = f.read()

print("Scanning transcript line-by-line...", flush=True)

# Parse line-by-line to save memory
edits = []
with open(transcript_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if not line.strip():
            continue
        try:
            obj = json.loads(line)
        except Exception as e:
            continue
        idx = obj.get('step_index')
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

print(f"Found {len(edits)} edits to apply.", flush=True)

def clean_target(s):
    if not s:
        return ''
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    s = s.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
    return s.replace('\r\n', '\n')

for i, edit in enumerate(edits):
    idx = edit['step_index']
    name = edit['name']
    args = edit['args']
    desc = args.get('Description') or args.get('Instruction') or ''
    print(f"[{i+1}/{len(edits)}] Applying Step {idx}: {desc[:80]}...", flush=True)
    
    try:
        if name == 'replace_file_content':
            target = clean_target(args.get('TargetContent') or args.get('targetContent'))
            replacement = clean_target(args.get('ReplacementContent') or args.get('replacementContent'))
            if not target:
                print(f"  WARNING: Target is empty string at step {idx}. Skipping.", flush=True)
                continue
            if target not in current_content:
                continue
            current_content = current_content.replace(target, replacement)
        elif name == 'multi_replace_file_content':
            chunks = args.get('ReplacementChunks') or args.get('replacementChunks') or []
            if isinstance(chunks, str):
                try:
                    chunks = json.loads(chunks)
                except Exception as e:
                    try:
                        chunks = eval(chunks)
                    except Exception as e2:
                        continue
            for chunk in chunks:
                if not isinstance(chunk, dict):
                    continue
                target = clean_target(chunk.get('TargetContent') or chunk.get('targetContent'))
                replacement = clean_target(chunk.get('ReplacementContent') or chunk.get('replacementContent'))
                if not target:
                    continue
                if target not in current_content:
                    continue
                current_content = current_content.replace(target, replacement)
    except Exception as e:
        print(f"  ERROR at step {idx}: {e}", flush=True)

# Save the rebuilt file
temp_out = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/AdminDashboard_rebuilt.tsx'
with open(temp_out, 'w', encoding='utf-8') as f:
    f.write(current_content)
print(f"SUCCESS: Rebuilt file saved to {temp_out}", flush=True)
