import re

def clean_code(text):
    text = re.sub(r'//.*', '', text)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    cleaned = []
    in_string = None
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

with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    code = f.read()

cleaned = clean_code(code)
paren_stack = []
brace_stack = []
line = 1
for idx, char in enumerate(cleaned):
    if char == '\n':
        line += 1
    elif char == '(':
        paren_stack.append((line, idx))
    elif char == ')':
        if paren_stack:
            p_line, p_idx = paren_stack.pop()
            if line >= 11200 and line <= 11400:
                print(f"Line {line}: popped paren from line {p_line}")
        else:
            if line >= 11200 and line <= 11400:
                print(f"Line {line}: Extra close paren")
    elif char == '{':
        brace_stack.append((line, idx))
    elif char == '}':
        if brace_stack:
            b_line, b_idx = brace_stack.pop()
            if line >= 11200 and line <= 11400:
                print(f"Line {line}: popped brace from line {b_line}")
        else:
            if line >= 11200 and line <= 11400:
                print(f"Line {line}: Extra close brace")
