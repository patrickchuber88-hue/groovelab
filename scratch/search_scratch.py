import os

scratch_dir = '/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch'
keywords = ['wochenübersicht', 'meine buchungen', 'heute button', 'heute-button', 'floor buttons', 'full sidebar', 'sidebar widget']

matches = []
for root, dirs, files in os.walk(scratch_dir):
    for file in files:
        if file.endswith('.py') or file.endswith('.js') or file.endswith('.json') or file.endswith('.jsonl') or file.endswith('.mjs'):
            if file in ['trace_current_transcript.py', 'restore_dashboard.py', 'restore_dashboard.js']:
                continue
        file_path = os.path.join(root, file)
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                found = []
                for kw in keywords:
                    if kw in content.lower():
                        found.append(kw)
                if found:
                    matches.append((file, found, len(content)))
        except Exception as e:
            pass

print("=== Matches in Scratch Directory ===")
for file, found, size in sorted(matches, key=lambda x: x[2], reverse=True):
    print(f"- {file} (size: {size} bytes): found {found}")
