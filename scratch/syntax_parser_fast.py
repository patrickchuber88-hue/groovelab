with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    code = f.read()

paren_stack = []
brace_stack = []
bracket_stack = []

line = 1
for idx, char in enumerate(code):
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

print("Total remaining open parens:", len(paren_stack))
if paren_stack:
    print("First 10 open parens left from lines:", [x[0] for x in paren_stack[:10]])
    print("Last 10 open parens left from lines:", [x[0] for x in paren_stack[-10:]])

print("Total remaining open braces:", len(brace_stack))
if brace_stack:
    print("First 10 open braces left from lines:", [x[0] for x in brace_stack[:10]])
    print("Last 10 open braces left from lines:", [x[0] for x in brace_stack[-10:]])

print("Total remaining open brackets:", len(bracket_stack))
if bracket_stack:
    print("First 10 open brackets left from lines:", [x[0] for x in bracket_stack[:10]])
    print("Last 10 open brackets left from lines:", [x[0] for x in bracket_stack[-10:]])
