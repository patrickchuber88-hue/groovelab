with open('apps/groovelab/src/App.tsx', 'r') as f:
    code = f.read()

import re

matches = re.finditer(r'useEffect\(\s*\(\s*\)\s*=>\s*\{', code)
for match in matches:
    start_pos = match.start()
    snippet = code[start_pos:start_pos+1500]
    dep_match = re.search(r'\}\s*,\s*\[(.*?)\]\s*\)', snippet)
    line_no = code.count('\n', 0, start_pos) + 1
    if dep_match:
        deps = dep_match.group(1)
        if 'user' in deps:
            print(f"Line {line_no}: dependencies = [{deps}]")
            # print first 300 chars of effect
            print(snippet[:300].strip())
            print("-" * 50)
