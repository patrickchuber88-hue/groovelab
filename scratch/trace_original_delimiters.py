with open('scratch/original.tsx', 'r') as f:
    orig_code = f.read()

line_numbers = []
current_line = 1
for char in orig_code:
    line_numbers.append(current_line)
    if char == '\n':
        current_line += 1

cleaned_chars = []
idx_map = []
in_single_comment = False
in_multi_comment = False
in_string = None
escape = False
idx = 0
while idx < len(orig_code):
    char = orig_code[idx]
    if in_single_comment:
        if char == '\n':
            in_single_comment = False
            cleaned_chars.append('\n')
            idx_map.append(idx)
        idx += 1
        continue
    if in_multi_comment:
        if char == '*' and idx + 1 < len(orig_code) and orig_code[idx+1] == '/':
            in_multi_comment = False
            idx += 2
        else:
            if char == '\n':
                cleaned_chars.append('\n')
                idx_map.append(idx)
            idx += 1
        continue
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
        if char == '\n':
            cleaned_chars.append('\n')
            idx_map.append(idx)
        idx += 1
        continue
    if char == '/' and idx + 1 < len(orig_code) and orig_code[idx+1] == '/':
        in_single_comment = True
        idx += 2
        continue
    if char == '/' and idx + 1 < len(orig_code) and orig_code[idx+1] == '*':
        in_multi_comment = True
        idx += 2
        continue
    if char in ("'", '"', '`'):
        in_string = char
        idx += 1
        continue
    cleaned_chars.append(char)
    idx_map.append(idx)
    idx += 1

cleaned = "".join(cleaned_chars)
paren_stack = []
brace_stack = []

for idx, char in enumerate(cleaned):
    orig_line = line_numbers[idx_map[idx]]
    
    if char == '(':
        paren_stack.append((orig_line, idx))
    elif char == ')':
        if paren_stack:
            p_line, p_idx = paren_stack.pop()
    elif char == '{':
        brace_stack.append((orig_line, idx))
    elif char == '}':
        if brace_stack:
            b_line, b_idx = brace_stack.pop()

print("Original Remaining open parens:", [p[0] for p in paren_stack])
print("Original Remaining open braces:", [b[0] for b in brace_stack])
