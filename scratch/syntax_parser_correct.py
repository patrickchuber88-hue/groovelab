def clean_code(text):
    # Remove single line comments
    text = re.sub(r'//.*', '', text)
    # Remove multi-line comments
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    
    # We want to replace string literals with empty strings, but be careful with escaped quotes
    # Simplified regex for double quoted, single quoted and template strings
    cleaned = []
    in_string = None
    in_regex = False
    escape = False
    
    idx = 0
    while idx < len(text):
        char = text[idx]
        
        if escape:
            escape = False
            idx += 1
            continue
            
        if char == '\\':
            escape = True
            idx += 1
            continue
            
        if in_string:
            if char == in_string:
                in_string = None
            idx += 1
            continue
            
        if char in ("'", '"', '`'):
            in_string = char
            idx += 1
            continue
            
        cleaned.append(char)
        idx += 1
        
    return "".join(cleaned)

import re

with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    code = f.read()

cleaned = clean_code(code)

paren_stack = []
brace_stack = []
bracket_stack = []

line = 1
for idx, char in enumerate(cleaned):
    if char == '\n':
        line += 1
    elif char == '(':
        paren_stack.append((line, idx))
    elif char == ')':
        if paren_stack:
            paren_stack.pop()
        else:
            print(f"Extra ) at line {line}")
    elif char == '{':
        brace_stack.append((line, idx))
    elif char == '}':
        if brace_stack:
            brace_stack.pop()
        else:
            print(f"Extra }} at line {line}")
    elif char == '[':
        bracket_stack.append((line, idx))
    elif char == ']':
        if bracket_stack:
            bracket_stack.pop()
        else:
            print(f"Extra ] at line {line}")

print("Cleaned remaining open parens:", len(paren_stack))
for p in paren_stack:
    # Print a snippet of cleaned around the paren
    snippet = cleaned[max(0, p[1]-20):min(len(cleaned), p[1]+40)].replace('\n', ' ')
    print(f"Line {p[0]}: ... {snippet} ...")

print("Cleaned remaining open braces:", len(brace_stack))
for b in brace_stack:
    snippet = cleaned[max(0, b[1]-20):min(len(cleaned), b[1]+40)].replace('\n', ' ')
    print(f"Line {b[0]}: ... {snippet} ...")

print("Cleaned remaining open brackets:", len(bracket_stack))
for br in bracket_stack:
    snippet = cleaned[max(0, br[1]-20):min(len(cleaned), br[1]+40)].replace('\n', ' ')
    print(f"Line {br[0]}: ... {snippet} ...")
