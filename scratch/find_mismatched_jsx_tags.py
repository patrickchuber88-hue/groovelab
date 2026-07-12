import re

with open('apps/groovelab/src/components/StudentAvatarDashboard.tsx', 'r') as f:
    orig_code = f.read()

# Precompute line numbers for every index in orig_code
line_numbers = []
current_line = 1
for char in orig_code:
    line_numbers.append(current_line)
    if char == '\n':
        current_line += 1

# Clean comments and strings
def clean_code(text):
    text = re.sub(r'//.*', '', text)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    cleaned_chars = []
    idx_map = []
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
        cleaned_chars.append(char)
        idx_map.append(idx)
        idx += 1
    return "".join(cleaned_chars), idx_map

cleaned, idx_map = clean_code(orig_code)

blacklist = {
    'any', 'string', 'number', 'boolean', 'void', 'React.FC', 'FC', 'HTMLDivElement',
    'HTMLCanvasElement', 'AudioContext', 'File', 'Record', 'React.SetStateAction',
    'SetStateAction', 'T', 'U', 'unknown'
}

stack = []
idx = 0

while idx < len(cleaned):
    char = cleaned[idx]
    orig_line = line_numbers[idx_map[idx]]
    
    if char == '<':
        if cleaned[idx:idx+4] == '<!--':
            idx = cleaned.find('-->', idx)
            if idx == -1: break
            idx += 3
            continue
            
        if cleaned[idx+1] == '/':
            tag_end = cleaned.find('>', idx)
            if tag_end == -1: break
            content = cleaned[idx+2:tag_end].strip()
            tag_name = ""
            if content:
                tag_name = content.split()[0]
            else:
                tag_name = "Fragment"
                
            if tag_name in blacklist or '.' in tag_name:
                idx = tag_end + 1
                continue
            if stack:
                opened_tag, opened_line = stack.pop()
                if opened_tag != tag_name:
                    print(f"Mismatched tag: opened <{opened_tag}> at line {opened_line}, closed </{tag_name}> at line {orig_line}")
            else:
                print(f"Extra closing tag </{tag_name}> at line {orig_line}")
            idx = tag_end + 1
            continue
            
        # Check if fragment <>
        if cleaned[idx+1] == '>':
            stack.append(("Fragment", orig_line))
            idx += 2
            continue
            
        match = re.match(r'^<([a-zA-Z][a-zA-Z0-9_.-]*)', cleaned[idx:])
        if match:
            tag_name = match.group(1)
            if tag_name in blacklist or tag_name.startswith('React.'):
                # Skip generic type parameters or type declarations
                tag_end = cleaned.find('>', idx)
                if tag_end == -1: break
                idx = tag_end + 1
                continue
                
            tag_end = cleaned.find('>', idx)
            if tag_end == -1: break
            
            # Check if self-closing
            is_self_closing = cleaned[tag_end-1] == '/'
            if not is_self_closing:
                stack.append((tag_name, orig_line))
            idx = tag_end + 1
            continue
            
    idx += 1

print("\n--- UNCLOSED TAGS AT END OF FILE ---")
for t, l in stack:
    print(f"Unclosed <{t}> from line {l}")
