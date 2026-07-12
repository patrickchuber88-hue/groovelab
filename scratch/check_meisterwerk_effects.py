with open('apps/groovelab/src/components/MeisterwerkDocumentationModal.tsx', 'r') as f:
    code = f.read()

import re

# Find all useEffect calls in MeisterwerkDocumentationModal.tsx
matches = re.finditer(r'useEffect\(\s*\(\s*\)\s*=>\s*\{', code)
for match in matches:
    start_pos = match.start()
    snippet = code[start_pos:start_pos+1500]
    dep_match = re.search(r'\}\s*,\s*\[(.*?)\]\s*\)', snippet)
    line_no = code.count('\n', 0, start_pos) + 1
    if dep_match:
        print(f"Line {line_no}: dependencies = [{dep_match.group(1)}]")
    else:
        no_dep_match = re.search(r'\}\s*\)', snippet)
        if no_dep_match:
            print(f"Line {line_no}: NO DEPENDENCY ARRAY (runs on every render!)")
        else:
            print(f"Line {line_no}: Unknown dependency structure")
