import json
import glob
import os

files = glob.glob("/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/recovered_*.txt")
print(f"Found {len(files)} recovered JSON files.")

for path in files:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            step = json.load(f)
        content = step.get('content', '')
        if content and 'Tagesplan (Unterrichte Heute)' in content:
            print(f"File {os.path.basename(path)} has content containing 'Tagesplan (Unterrichte Heute)'!")
            lines = content.split('\n')
            print("  Length of content:", len(content))
            # print lines range
            num_lines = len(lines)
            print(f"  Lines range: {lines[0]} ... {lines[-1]} ({num_lines} lines)")
            # Let's save this content to a clean text file
            with open(f"/Users/patrickhuber/Documents/Antigravity Projects/Groovelab app/scratch/clean_{os.path.basename(path)}", 'w', encoding='utf-8') as out:
                out.write(content)
    except Exception as e:
        pass
