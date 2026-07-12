with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    code = f.read()

paren_stack = []
brace_stack = []
bracket_stack = []

for idx, char in enumerate(code):
    line = code[:idx].count('\n') + 1
    if char == '(':
        paren_stack.append(line)
    elif char == ')':
        if paren_stack:
            paren_stack.pop()
        else:
            print(f"Extra ) at line {line}")
    elif char == '{':
        brace_stack.append(line)
    elif char == '}':
        if brace_stack:
            brace_stack.pop()
        else:
            print(f"Extra }} at line {line}")
    elif char == '[':
        bracket_stack.append(line)
    elif char == ']':
        if bracket_stack:
            bracket_stack.pop()
        else:
            print(f"Extra ] at line {line}")

print("Open parens left from lines:", paren_stack)
print("Open braces left from lines:", brace_stack)
print("Open brackets left from lines:", bracket_stack)
