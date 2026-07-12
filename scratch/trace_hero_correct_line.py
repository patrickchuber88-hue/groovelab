with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    orig_code = f.read()

# Precompute line numbers for every index in orig_code
line_numbers = []
current_line = 1
for char in orig_code:
    line_numbers.append(current_line)
    if char == '\n':
        current_line += 1

# Clean code and build index map
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
            cleaned_chars.append(char)
            idx_map.append(idx)
        idx += 1
        continue
        
    if in_multi_comment:
        if char == '*' and idx + 1 < len(orig_code) and orig_code[idx+1] == '/':
            in_multi_comment = False
            idx += 2
        else:
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

# Helper function to get line number in orig_code (O(1))
def get_orig_line(cleaned_idx):
    orig_idx = idx_map[cleaned_idx]
    return line_numbers[orig_idx]

paren_stack = []
brace_stack = []

for idx, char in enumerate(cleaned):
    orig_line = get_orig_line(idx)
    if char == '(':
        paren_stack.append((orig_line, idx))
    elif char == ')':
        if paren_stack:
            p_line, p_idx = paren_stack.pop()
            if orig_line >= 11800 and orig_line <= 12140:
                print(f"Line {orig_line}: popped paren from line {p_line}")
        else:
            if orig_line >= 11800 and orig_line <= 12140:
                print(f"Line {orig_line}: Extra close paren")
    elif char == '{':
        brace_stack.append((orig_line, idx))
    elif char == '}':
        if brace_stack:
            b_line, b_idx = brace_stack.pop()
            if orig_line >= 11800 and orig_line <= 12140:
                print(f"Line {orig_line}: popped brace from line {b_line}")
        else:
            if orig_line >= 11800 and orig_line <= 12140:
                print(f"Line {orig_line}: Extra close brace")

print("Remaining open parens in this range:", [p[0] for p in paren_stack if p[0] >= 11800 and p[0] <= 12140])
print("Remaining open braces in this range:", [b[0] for b in brace_stack if b[0] >= 11800 and b[0] <= 12140])
