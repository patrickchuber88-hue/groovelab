with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    code = f.read()

import re

# We want to find state setters called directly in the component body
# A state setter starts with `set[A-Z][a-zA-Z]*(`
# Let's extract the main function body of StudentAvatarDashboard.
# It starts at line 2145: `export function StudentAvatarDashboard...`
# And ends around line 5849: `return (`
# Let's search inside this range for any state setters that are NOT inside a useEffect, a callback function, or a promise/async block.

start_idx = code.find('export function StudentAvatarDashboard')
end_idx = code.find('return (', start_idx)
body = code[start_idx:end_idx]

# Let's find all lines containing `set`
lines = body.split('\n')
for idx, line in enumerate(lines):
    line_no = idx + 2145
    # Look for matches of setSomething(
    matches = re.findall(r'\b(set[A-Z][a-zA-Z]*)\s*\(', line)
    for m in matches:
        # Check if the line is a hook definition like `const [x, setX] = useState`
        if 'const [' in line and 'useState' in line:
            continue
        # Check if it is inside a function definition `const handle... = () => {`
        # We can analyze the nesting or simply print it out for manual check
        print(f"Line {line_no}: {line.strip()}")
