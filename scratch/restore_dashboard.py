import json
import re
import os
import subprocess

file_path = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/apps/groovelab/src/components/AdminDashboard.tsx'
transcript_path = '/Users/patrickhuber/.gemini/antigravity/brain/5ca7972a-16fb-4a7f-9d8d-52fce61bcbe2/.system_generated/logs/transcript.jsonl'

# Get original content from git HEAD
original_content = subprocess.check_output(
    ['git', 'show', 'HEAD:apps/groovelab/src/components/AdminDashboard.tsx'],
    cwd='/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app'
).decode('utf8')

original_content = original_content.replace('\r\n', '\n')

# Parse steps
steps = []
with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        if line.strip():
            steps.append(json.loads(line))

edits = []
for i, step in enumerate(steps):
    idx = step.get('step_index')
    if idx > 679:
         continue
    if step.get('source') == 'MODEL' and step.get('type') == 'PLANNER_RESPONSE' and 'tool_calls' in step:
         # Find outcome step
         outcome_step = None
         for j in range(i + 1, len(steps)):
              if steps[j].get('step_index') == idx + 1:
                   outcome_step = steps[j]
                   break
         is_success = outcome_step and outcome_step.get('content') and (
              outcome_step['content'].startswith('Created At:') or
              outcome_step['content'].startswith('The following changes were made') or
              'successfully' in outcome_step['content']
         )
         if is_success:
              for tc in step['tool_calls']:
                   name = tc.get('name')
                   args = tc.get('arguments') or tc.get('args') or {}
                   target_file = args.get('TargetFile') or ''
                   if name in ['replace_file_content', 'multi_replace_file_content'] and 'AdminDashboard.tsx' in target_file:
                        edits.append({
                             'step_index': idx,
                             'name': name,
                             'args': args
                        })

print(f"Found {len(edits)} successful edits to apply sequentially...")

def clean_target(s):
    if not s:
        return ''
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1]
    
    # Safely decode escaped strings
    s = s.replace('\\n', '\n').replace('\\t', '\t').replace('\\"', '"').replace('\\\\', '\\')
    return s.replace('\r\n', '\n')

current_content = original_content

for edit in edits:
    idx = edit['step_index']
    name = edit['name']
    args = edit['args']
    print(f"Applying step {idx} ({name})...")
    
    if name == 'replace_file_content':
        target_val = args.get('TargetContent') or args.get('targetContent')
        replacement_val = args.get('ReplacementContent') or args.get('replacementContent')
        
        target = clean_target(target_val)
        replacement = clean_target(replacement_val)
        
        if target not in current_content:
            print(f"ERROR: TargetContent not found in step {idx}!")
            print(f"Target sample: {repr(target[:100])}")
            exit(1)
        current_content = current_content.replace(target, replacement)
        
    elif name == 'multi_replace_file_content':
        chunks = args.get('ReplacementChunks') or args.get('replacementChunks')
        if isinstance(chunks, str):
            chunks = json.loads(chunks, strict=False)
        for chunk in chunks:
            target_val = chunk.get('TargetContent') or chunk.get('targetContent')
            replacement_val = chunk.get('ReplacementContent') or chunk.get('replacementContent')
            
            target = clean_target(target_val)
            replacement = clean_target(replacement_val)
            
            if target not in current_content:
                print(f"ERROR: TargetContent not found in step {idx} multi-chunk!")
                print(f"Target sample: {repr(target[:100])}")
                exit(1)
            current_content = current_content.replace(target, replacement)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(current_content)

print("Successfully restored AdminDashboard.tsx to step 679 via python!")
